import os
import logging
from typing import List, Optional, Dict, Any

from transformers import pipeline

logger = logging.getLogger(__name__)

# Model id known for fake-news detection (fine-tuned on LIAR/FEVER-like datasets)
DEFAULT_FAKE_NEWS_MODEL = os.getenv("FAKE_NEWS_MODEL", "mrm8488/bert-tiny-finetuned-fake-news-detection")

_classifier = None  # lazy-init


def _load_pipeline(model_id: str = DEFAULT_FAKE_NEWS_MODEL):
    global _classifier
    if _classifier is not None:
        return _classifier
    try:
        _classifier = pipeline("text-classification", model=model_id)
        logger.info(f"Fake news model loaded: {model_id}")
    except Exception as e:
        logger.error(f"Failed to load fake news model '{model_id}': {e}")
        _classifier = None
    return _classifier


def predict_fake_news(texts: List[str]) -> List[Dict[str, Any]]:
    """
    Predict fake/real for a list of texts. Returns list of {label, score}.
    Falls back to simple heuristic if model can't load.
    """
    clf = _load_pipeline()
    results: List[Dict[str, Any]] = []
    if clf is None:
        # Simple fallback heuristic using keywords
        suspicious = {"claim", "shocking", "you won't believe", "viral", "hoax", "fake", "exposed", "breaking"}
        for t in texts:
            tl = (t or "").lower()
            hit = any(k in tl for k in suspicious) or len(tl) < 40
            results.append({"label": "FAKE" if hit else "REAL", "score": 0.5})
        return results

    # Truncate inputs to avoid extremely long sequences
    proc = [t[:512] if isinstance(t, str) else "" for t in texts]
    try:
        raw = clf(proc)
        for r in raw:
            label = r.get("label") or ""
            score = float(r.get("score") or 0.0)
            # Normalize label vocabulary to FAKE/REAL if needed
            if label.lower() in {"fake", "false"}:
                label = "FAKE"
            elif label.lower() in {"real", "true"}:
                label = "REAL"
            results.append({"label": label, "score": score})
        return results
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return [{"label": "UNKNOWN", "score": 0.0} for _ in texts]


# Training stub - downloads a public dataset via HF 'datasets' and fine-tunes DistilBERT.
# To keep runtime and dependencies light, we implement a callable that only runs when invoked.

def train_fake_news(model_out_dir: str = "models/fake_news", dataset_name: str = "liar") -> Dict[str, Any]:
    """
    Train a fake news classifier using a public dataset.
    - dataset_name: one of known public sets (e.g., 'liar').
    - model_out_dir: relative path under backend folder to save model.

    Returns minimal metrics and where the model was saved.
    """
    try:
        import os
        from datasets import load_dataset
        from transformers import AutoTokenizer, AutoModelForSequenceClassification, TrainingArguments, Trainer
        import numpy as np
        from sklearn.metrics import accuracy_score, f1_score

        base_model = os.getenv("FAKE_NEWS_BASE_MODEL", "distilbert-base-uncased")

        # Load dataset
        if dataset_name == "liar":
            ds = load_dataset("liar")
            # Map labels to binary FAKE(1)/REAL(0) (liar has 6-way labels)
            def map_label(example):
                # true(0), mostly-true(1), half-true(2), barely-true(3), false(4), pants-fire(5)
                y = example["label"]
                # treat 0,1 as REAL; others as FAKE
                example["target"] = 0 if y in (0, 1) else 1
                # text field combine statement and context
                st = example.get("statement") or ""
                cn = example.get("context") or ""
                example["text"] = f"{st} [CTX] {cn}".strip()
                return example
            ds = ds.map(map_label)
            ds = ds.rename_column("target", "labels")
            ds = ds.remove_columns([c for c in ds["train"].column_names if c not in ("text", "labels")])
        else:
            # Default fallback: just use 'liar'
            ds = load_dataset("liar")

        tokenizer = AutoTokenizer.from_pretrained(base_model)

        def tok(batch):
            return tokenizer(batch["text"], truncation=True, padding="max_length", max_length=256)

        ds_enc = ds.map(tok, batched=True)
        ds_enc = ds_enc.rename_columns({"labels": "labels"})
        ds_enc.set_format(type="torch", columns=["input_ids", "attention_mask", "labels"]) 

        model = AutoModelForSequenceClassification.from_pretrained(base_model, num_labels=2)

        def compute_metrics(eval_pred):
            logits, labels = eval_pred
            preds = np.argmax(logits, axis=-1)
            return {
                "accuracy": accuracy_score(labels, preds),
                "f1": f1_score(labels, preds)
            }

        args = TrainingArguments(
            output_dir=model_out_dir,
            evaluation_strategy="epoch",
            learning_rate=5e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=32,
            num_train_epochs=1,  # keep light; adjust as needed
            weight_decay=0.01,
            logging_steps=50,
            save_strategy="epoch",
            push_to_hub=False,
        )

        trainer = Trainer(
            model=model,
            args=args,
            train_dataset=ds_enc["train"],
            eval_dataset=ds_enc.get("validation", ds_enc["train"][0:2000]),
            tokenizer=tokenizer,
            compute_metrics=compute_metrics,
        )

        trainer.train()
        metrics = trainer.evaluate()
        # Save model locally
        os.makedirs(model_out_dir, exist_ok=True)
        trainer.save_model(model_out_dir)
        tokenizer.save_pretrained(model_out_dir)

        # After training, reload pipeline to use the fine-tuned model
        global _classifier
        _classifier = pipeline("text-classification", model=model_out_dir)

        return {"status": "trained", "metrics": metrics, "model_path": model_out_dir}
    except Exception as e:
        logger.error(f"Training failed: {e}")
        return {"status": "error", "error": str(e)}