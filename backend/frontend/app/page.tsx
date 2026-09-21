'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bars3Icon,
  XMarkIcon,
  ArrowRightIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  NewspaperIcon,
  UserGroupIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/react/24/outline';

const testimonials = [
  {
    id: 1,
    content: "This platform has transformed how I consume financial news. The AI analysis helps me make better investment decisions.",
    author: "Sarah Johnson",
    role: "Investment Analyst"
  },
  {
    id: 2,
    content: "The sentiment analysis is incredibly accurate. It's like having a personal financial advisor at my fingertips.",
    author: "Michael Chen",
    role: "Day Trader"
  },
  {
    id: 3,
    content: "I've been able to stay ahead of market trends thanks to the sector-specific insights this platform provides.",
    author: "Alex Rodriguez",
    role: "Portfolio Manager"
  }
];

// Helper to toggle dark mode
import { Dispatch, SetStateAction } from 'react';

function useDarkMode(): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [isDark, setIsDark] = useState(false);

  // Initialize from localStorage or system preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = stored ? stored === 'dark' : prefersDark;
      setIsDark(initial);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      try { localStorage.setItem('theme', 'dark'); } catch {}
    } else {
      document.documentElement.classList.remove('dark');
      try { localStorage.setItem('theme', 'light'); } catch {}
    }
  }, [isDark]);

  return [isDark, setIsDark];
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isDark, setIsDark] = useDarkMode();

  // Rotating headlines for hero card
  const [headlines, setHeadlines] = useState<{ title: string; image?: string; url?: string; source?: string }[]>([]);
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    // Fetch headlines from backend
    const fetchHeadlines = async () => {
      try {
        const response = await fetch(
          "/api/news/headlines/?limit=5"
        );
        const data = await response.json();
        if (Array.isArray(data.items)) setHeadlines(data.items.filter((i: any) => i?.title));
      } catch (e) {
        console.error('Failed to fetch headlines', e);
      }
    };
    fetchHeadlines();
  }, []);

  useEffect(() => {
    if (headlines.length === 0) return;
    const id = setInterval(() => {
      setHeadlineIndex((i) => (i + 1) % headlines.length);
    }, 4000);
    return () => clearInterval(id);
  }, [headlines]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900 transition-colors">
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 dark:bg-black/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
              <GlobeAltIcon className="h-8 w-8 text-red-600 dark:text-red-400 mr-2" />
              <h1 className="text-3xl font-extrabold text-white">NewsX</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#about" className="text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 text-sm font-medium transition-colors">
                  About Us
                </a>
                <a href="#features" className="text-black -700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 text-sm font-medium transition-colors">
                  Features
                </a>
                <a href="#testimonials" className="text-black-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 text-sm font-medium transition-colors">
                  Testimonials
                </a>
                <Link href="/login" className="text-black-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 text-sm font-medium transition-colors">
                  Login
                </Link>
                <Link href="/signup" className="bg-red-600 dark:bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 dark:hover:bg-red-600 transition-colors">
                  Sign Up
                </Link>
                {/* Dark mode toggle */}
                <button
                  className="ml-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setIsDark(!isDark)}
                  aria-label="Toggle dark mode"
                >
                  {isDark ? (
                    <SunIcon className="h-5 w-5 text-yellow-400" />
                  ) : (
                    <MoonIcon className="h-5 w-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              {/* Dark mode toggle */}
              <button
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                onClick={() => setIsDark(!isDark)}
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <SunIcon className="h-5 w-5 text-yellow-400" />
                ) : (
                  <MoonIcon className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={toggleMenu}
                className="text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 p-2"
              >
                {isMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-black px-4 pb-4 pt-2 shadow-lg">
            <a href="#about" className="block py-2 text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400">About Us</a>
            <a href="#features" className="block py-2 text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400">Features</a>
            <a href="#testimonials" className="block py-2 text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400">FAQs</a>
            <Link href="/login" className="block py-2 text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400">Login</Link>
            <Link href="/signup" className="block py-2 mt-2 bg-red-600 dark:bg-red-500 text-white rounded-md text-center">Sign Up</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
<section
  className="relative flex items-center min-h-screen w-full px-4 sm:px-6 lg:px-8 overflow-hidden"
>
  {/* Background image */}
  <Image
    src="https://cdn.pixabay.com/photo/2016/02/01/00/56/news-1172463_1280.jpg"
    alt="News background"
    fill
    className="object-cover z-0"
    priority
  />
  {/* Overlay for image opacity */}
  <div className="absolute inset-0 bg-black bg-opacity-80 pointer-events-none z-10" />
  <div className="relative z-20 w-full">
    <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-8 items-center min-h-[70vh]">
      <div className="lg:col-span-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
          <span className="block">Intelligent News</span>
          <span className="block text-gray-300">Analysis Platform</span>
        </h1>
        <p className="mt-6 text-xl text-gray-200">
          Transform how you consume news with AI-powered analysis, sentiment detection, and personalized insights.
        </p>
        <div className="mt-10 flex gap-4">
          <Link href="/signup" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700">
            Get Started
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </Link>
          <a href="#features" className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-white bg-black-900 bg-opacity-70 hover:bg-black-800">
            Learn More
          </a>
        </div>
      </div>
      <div className="mt-12 lg:mt-0 lg:col-span-6">
        <div className="bg-white bg-opacity-80 rounded-2xl shadow-xl overflow-hidden">
          <div className="relative h-80 flex items-center justify-center">
            <video className="absolute inset-0 w-full h-full object-cover z-0" autoPlay loop muted playsInline poster="/window.svg">
              <source src="/demo-news.mp4" type="video/mp4" />
              <source src="https://cdn.coverr.co/videos/coverr-reading-news-online-7876/1080p.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/40"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white p-6 relative z-10">
                <NewspaperIcon className="h-16 w-16 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Real-time News</h3>
                <div className="h-12 flex items-center justify-center px-4">
                  {headlines.length > 0 ? (
                    <a
                      href={headlines[headlineIndex]?.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-white/90 hover:text-white transition-colors truncate max-w-[28rem] mx-auto"
                      title={headlines[headlineIndex]?.title}
                    >
                      {headlines[headlineIndex]?.title}
                    </a>
                  ) : (
                    <p className="text-red-100">Fetching latest headlines…</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

{/* Features Section */}
<section id="features" className="py-32 bg-white dark:bg-black">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
        Powerful Features
      </h2>
      <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300">
        Everything you need to stay informed and make better decisions.
      </p>
    </div>

    <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {/* Feature cards */}
      {[
        { icon: DocumentTextIcon, title: "AI-Powered Summaries", desc: "Get concise summaries of complex articles, saving you time while keeping you informed." },
        { icon: ChartBarIcon, title: "Sentiment Analysis", desc: "Understand the tone and bias of news articles with our advanced sentiment detection." },
        { icon: LightBulbIcon, title: "Smart Q&A", desc: "Ask questions about any article and get intelligent, context-aware answers." },
        { icon: UserGroupIcon, title: "Sector Analysis", desc: "Track news by industry sectors and understand market impacts across different domains." },
        { icon: ShieldCheckIcon, title: "Impact Scoring", desc: "Evaluate the potential impact of news on markets and industries with our proprietary scoring system." },
        { icon: GlobeAltIcon, title: "Global Coverage", desc: "Access and analyze news from sources around the world with our comprehensive platform." }
      ].map((feature) => (
        <div key={feature.title} className="bg-red-50 dark:bg-gray-800 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
          <div className="h-12 w-12 rounded-md bg-red-600 dark:bg-red-500 flex items-center justify-center">
            <feature.icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">{feature.title}</h3>
          <p className="mt-2 text-gray-600 dark:text-gray-300">{feature.desc}</p>
        </div>
      ))}
    </div>
  </div>
</section>
      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-red-50 dark:bg-gray-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-300">
          Answers to common questions about NewsX.
        </p>
          </div>
          <div className="mt-16 max-w-3xl mx-auto space-y-8">
        {/* FAQ items */}
        {[
          {
            question: "What is NewsX?",
            answer: "NewsX is an AI-powered platform that provides intelligent news analysis, sentiment detection, and personalized insights for professionals."
          },
          {
            question: "How does the sentiment analysis work?",
            answer: "Our platform uses advanced natural language processing to detect the tone and bias of news articles, helping you understand market sentiment."
          },
          {
            question: "Is NewsX free to use?",
            answer: "NewsX offers both free and premium plans. You can get started for free and upgrade anytime for more advanced features."
          },
          {
            question: "Can I access NewsX on mobile devices?",
            answer: "Yes, NewsX is fully responsive and works seamlessly on smartphones, tablets, and desktops."
          },
          {
            question: "How do I get support?",
            answer: "You can reach our support team at support@newsx.com or use the contact form on our website."
          }
        ].map((faq, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
            <p className="text-gray-600 dark:text-gray-300">{faq.answer}</p>
          </div>
        ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
                About NewsX
              </h2>
              <p className="mt-4 text-lg text-gray-500 dark:text-gray-300">
                NewsX was founded with a simple mission: to help professionals cut through the noise and get to the heart of what matters in the news.
              </p>
              <p className="mt-4 text-lg text-gray-500 dark:text-gray-300">
                Our platform combines cutting-edge AI technology with intuitive design to deliver a news analysis experience that saves you time and provides deeper insights.
              </p>
              <p className="mt-4 text-lg text-gray-500 dark:text-gray-300">
                Whether you're an investor, analyst, or business professional, NewsX gives you the tools to stay informed and make better decisions.
              </p>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="bg-red-600 dark:bg-red-500 rounded-xl overflow-hidden">
                <div className="h-full p-8 text-white">
                  <h3 className="text-2xl font-bold mb-4">Start Your Journey Today</h3>
                  <p className="mb-6">
                    Join thousands of professionals who trust NewsX for their daily news analysis.
                  </p>
                  <Link href="/signup" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-red-600 dark:text-red-200 bg-white dark:bg-gray-900 hover:bg-red-50 dark:hover:bg-gray-800">
                    Sign Up Now
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center">
                <GlobeAltIcon className="h-8 w-8 text-red-400 mr-2" />
                <h2 className="text-2xl font-bold text-white">NewsX</h2>
              </div>
              <p className="mt-4 text-gray-400">
                Intelligent news analysis for the modern professional.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Home</a></li>
                <li><a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a></li>
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Testimonials</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-gray-400">support@newsx.com</li>
                <li className="text-gray-400">7975033026</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 dark:border-gray-700 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} NewsX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}