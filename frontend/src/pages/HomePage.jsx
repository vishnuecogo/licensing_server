import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    messagesProcessed: 0,
    aiAccuracy: 0,
    responseTime: 0,
    uptime: 0
  });

  // Animate stats on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        messagesProcessed: 25000,
        aiAccuracy: 98.7,
        responseTime: 3,
        uptime: 99.9
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // AI Intelligence Features
  const aiFeatures = [
    {
      icon: 'psychology',
      title: 'Multi-Domain AI Intelligence',
      description: 'Advanced AI that adapts to travel, software development, medical, and custom domains with database-driven prompt configurations.',
      metrics: '2200+ Knowledge Base Documents',
      highlight: 'Enterprise AI'
    },
    {
      icon: 'auto_fix_high',
      title: 'Confidence-Based Response Filtering',
      description: 'Intelligent response filtering with 8/10 confidence threshold (9/10 for sensitive data) and RAG context awareness.',
      metrics: '98.7% Accuracy Rate',
      highlight: 'Smart Filter'
    },
    {
      icon: 'psychology_alt',
      title: 'Human-Like Conversation Patterns',
      description: 'Natural conversation flow with typing indicators, response delays, and style adaptation based on user communication patterns.',
      metrics: 'Real-time Analysis',
      highlight: 'Natural AI'
    },
    {
      icon: 'school',
      title: 'Intelligent Learning System',
      description: 'Auto-improvement after 100 conversations with domain knowledge refinement and confidence threshold optimization.',
      metrics: '100+ Conversation Threshold',
      highlight: 'Self-Learning'
    }
  ];

  // Multi-Channel Management Features
  const channelFeatures = [
    {
      icon: 'hub',
      title: 'Multi-Channel Support',
      description: 'Comprehensive contact management with profile photos, pushname display, and last activity tracking.',
      metrics: 'Unlimited Contacts',
      highlight: 'Enterprise Scale'
    },
    {
      icon: 'block',
      title: 'Advanced Block List Management',
      description: 'Temporary block list functionality with frontend management interface and real-time message filtering.',
      metrics: 'Real-time Filtering',
      highlight: 'Smart Blocking'
    },
    {
      icon: 'qr_code',
      title: 'Smart QR Code Management',
      description: 'QR code generation with intelligent expiry handling and automatic refresh capabilities.',
      metrics: 'Auto-Refresh',
      highlight: 'Smart QR'
    },
    {
      icon: 'format_align_left',
      title: 'Advanced Message Formatting',
      description: 'WhatsApp-specific styling with bold headers, bullet points, and proper line breaks for professional communication.',
      metrics: 'Professional Format',
      highlight: 'Enterprise Ready'
    }
  ];

  // Analytics & Insights Features
  const analyticsFeatures = [
    {
      icon: 'analytics',
      title: 'Real-time Analytics Dashboard',
      description: 'Comprehensive dashboard with Chart.js visualizations, conversation analytics, and performance metrics.',
      metrics: 'Real-time Insights',
      highlight: 'Analytics'
    },
    {
      icon: 'trending_up',
      title: 'Conversation Intelligence',
      description: 'Track conversation history with style adaptation analysis (formality, verbosity, emoji usage patterns).',
      metrics: 'Style Analysis',
      highlight: 'Smart Insights'
    },
    {
      icon: 'storage',
      title: 'Vector Store Intelligence',
      description: 'Advanced knowledge base with semantic, hybrid, and ensemble search capabilities for intelligent responses.',
      metrics: 'Multi-format Support',
      highlight: 'Smart Search'
    },
    {
      icon: 'security',
      title: 'Enterprise Security',
      description: 'SOC 2 compliance, data encryption, and enterprise-grade security with 99.9% uptime guarantee.',
      metrics: '99.9% Uptime',
      highlight: 'Enterprise Grade'
    }
  ];

  // Developer Tools Features
  const developerFeatures = [
    {
      icon: 'code',
      title: 'Comprehensive API',
      description: 'RESTful API with extensive documentation, SDKs, and webhook support for seamless integration.',
      metrics: 'Full REST API',
      highlight: 'Developer Ready'
    },
    {
      icon: 'upload_file',
      title: 'Multi-format Knowledge Base',
      description: 'Support for PDF, TXT, DOCX, MD, CSV, and XLSX files with intelligent content processing.',
      metrics: '6+ File Formats',
      highlight: 'Flexible Import'
    },
    {
      icon: 'settings',
      title: 'CRUD Management Interface',
      description: 'Complete enterprise dashboard with comprehensive CRUD interfaces for all backend endpoints.',
      metrics: 'Full Management',
      highlight: 'Enterprise UI'
    },
    {
      icon: 'integration_instructions',
      title: 'Docker-Ready Deployment',
      description: 'Production-ready Docker containers with development environment support and easy scaling.',
      metrics: 'Container Ready',
      highlight: 'DevOps Friendly'
    }
  ];

  // Trust indicators
  const trustIndicators = [
    { icon: 'verified_user', text: '100% AI Code' },
    { icon: 'lock', text: 'End-to-End Encryption' },
    { icon: 'speed', text: '99.9% Uptime SLA' },
    { icon: 'support_agent', text: '24/7 Enterprise Support' },
    { icon: 'cloud_done', text: 'Hybrid Infrastructure' },
    { icon: 'shield', text: 'Data Sovereignty' }
  ];

  return (
    <div className="flex flex-col">
      {/* Navigation Header */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">psychology</span>
              </div>
              <div className="text-white">
                <h1 className="text-xl font-bold">EVA</h1>
                <p className="text-xs text-white/80">by ecogo.ai</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-white/90 hover:text-white transition-colors text-sm font-medium">
                Features
              </a>
              <a href="#about" className="text-white/90 hover:text-white transition-colors text-sm font-medium">
                About
              </a>
              <a href="#pricing" className="text-white/90 hover:text-white transition-colors text-sm font-medium">
                Pricing
              </a>
            </div>

            {/* Desktop Login Button */}
            <div className="hidden md:flex items-center">
              <Link
                to="/login"
                className="bg-white text-eva-600 px-8 py-2 rounded-full font-semibold hover:bg-white/90 transition-all text-sm flex items-center space-x-2 shadow-lg"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                <span>Login</span>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white p-2 rounded-lg hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined text-xl">
                  {mobileMenuOpen ? 'close' : 'menu'}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-white/90 hover:text-white transition-colors text-sm font-medium py-2">
                  Features
                </a>
                <a href="#about" className="text-white/90 hover:text-white transition-colors text-sm font-medium py-2">
                  About
                </a>
                <a href="#pricing" className="text-white/90 hover:text-white transition-colors text-sm font-medium py-2">
                  Pricing
                </a>
                <div className="border-t border-white/20 pt-4">
                  <Link
                    to="/login"
                    className="bg-white text-eva-600 px-4 py-2 rounded-lg font-semibold hover:bg-white/90 transition-all text-sm flex items-center space-x-2 justify-center shadow-lg"
                  >
                    <span className="material-symbols-outlined text-lg">login</span>
                    <span>Login</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-4 text-center text-white overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-eva-600 via-eva-700 to-eva-800"></div>

        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-white rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-white rounded-full animate-pulse delay-2000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
              🤖 EVA by ecogo.ai - Enterprise AI Communication Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight font-poppins">
            EVA
            <span className="block text-4xl md:text-6xl bg-gradient-to-r from-ecogo-300 to-ecogo-400 bg-clip-text text-transparent">
              Virtual Assistant
            </span>
          </h1>

          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto leading-relaxed">
            Powered by <span className="font-semibold">Ecogo AI</span> - Transform customer communication with EVA's intelligent AI platform featuring
            multi-domain intelligence, real-time analytics, and enterprise-grade security.
            <span className="font-semibold"> 2200+ knowledge base documents</span> and
            <span className="font-semibold"> 98.7% AI accuracy</span> out of the box.
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-ecogo-300">
                {stats.messagesProcessed.toLocaleString()}+
              </div>
              <div className="text-sm text-white/80">Messages Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-ecogo-300">
                {stats.aiAccuracy}%
              </div>
              <div className="text-sm text-white/80">AI Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-ecogo-300">
                {stats.responseTime}s
              </div>
              <div className="text-sm text-white/80">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-ecogo-300">
                {stats.uptime}%
              </div>
              <div className="text-sm text-white/80">Uptime SLA</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              to="/login"
              className="bg-white text-eva-600 px-12 py-4 rounded-full font-semibold hover:bg-white/90 transition-all transform hover:scale-105 text-lg shadow-xl flex items-center justify-center space-x-3"
            >
              <span className="material-symbols-outlined text-xl">login</span>
              <span>Login to Platform</span>
            </Link>
            <Link
              to="#features"
              className="bg-transparent border-2 border-white text-white px-12 py-4 rounded-full font-semibold hover:bg-white/10 transition-all text-lg backdrop-blur-sm flex items-center justify-center space-x-3"
            >
              <span className="material-symbols-outlined text-xl">explore</span>
              <span>Explore Features</span>
            </Link>
          </div>


        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-eva-500/10 rounded-full flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-eva-600 text-xl">{indicator.icon}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">{indicator.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Intelligence Features */}
      <section id="features" className="py-20 bg-gradient-to-br from-eva-50 to-eva-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-eva-100 text-eva-800 rounded-full text-sm font-medium mb-4">
              🧠 EVA AI Intelligence
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Advanced AI That Understands Context
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              EVA's enterprise AI goes beyond simple chatbots with multi-domain intelligence,
              confidence-based filtering, and human-like conversation patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {aiFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-eva-500 to-eva-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-2xl">{feature.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                      <span className="px-3 py-1 bg-eva-100 text-eva-800 rounded-full text-xs font-medium">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                    <div className="flex items-center text-sm">
                      <span className="material-symbols-outlined text-eva-500 mr-2 text-lg">trending_up</span>
                      <span className="font-semibold text-eva-600">{feature.metrics}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-Channel Management Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-ecogo-100 text-ecogo-800 rounded-full text-sm font-medium mb-4">
              📱 Multi-Channel Management
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Comprehensive Channel Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Manage all your communications with EVA's advanced contact management,
              smart blocking, and professional message formatting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {channelFeatures.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-ecogo-50 to-ecogo-100 rounded-2xl p-8 border border-ecogo-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-ecogo-500 to-ecogo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-2xl">{feature.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                      <span className="px-3 py-1 bg-ecogo-100 text-ecogo-800 rounded-full text-xs font-medium">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                    <div className="flex items-center text-sm">
                      <span className="material-symbols-outlined text-ecogo-500 mr-2 text-lg">check_circle</span>
                      <span className="font-semibold text-ecogo-600">{feature.metrics}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics & Insights Features */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-4">
              📊 Analytics & Insights
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Real-time Intelligence & Analytics
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get deep insights into your conversations with advanced analytics,
              vector store intelligence, and enterprise-grade security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {analyticsFeatures.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-purple-100">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-2xl">{feature.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                    <div className="flex items-center text-sm">
                      <span className="material-symbols-outlined text-purple-500 mr-2 text-lg">insights</span>
                      <span className="font-semibold text-purple-600">{feature.metrics}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer Tools Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium mb-4">
              🛠️ Developer Tools
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Built for Developers, Loved by Enterprises
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive APIs, multi-format support, and enterprise-grade deployment options
              that make integration seamless and scaling effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {developerFeatures.map((feature, index) => (
              <div key={index} className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border border-orange-100 hover:shadow-lg transition-all duration-300">
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-2xl">{feature.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        {feature.highlight}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                    <div className="flex items-center text-sm">
                      <span className="material-symbols-outlined text-orange-500 mr-2 text-lg">code</span>
                      <span className="font-semibold text-orange-600">{feature.metrics}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Ecogo AI Expertise Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Powered by ecogo.ai Expertise
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              EVA is built by ecogo AI's proven expertise in AI software development, visual recognition,
              and solving real-world business problems across multiple industries.
            </p>
          </div>

          {/* Ecogo AI Specialties */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-eva-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-eva-600 text-2xl">smart_toy</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">AI Software Development</h3>
              <p className="text-gray-600 text-sm">Custom AI solutions tailored to business needs</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-ecogo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-ecogo-600 text-2xl">visibility</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Visual Recognition</h3>
              <p className="text-gray-600 text-sm">Advanced computer vision and image processing</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-eva-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-eva-600 text-2xl">business</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Enterprise Solutions</h3>
              <p className="text-gray-600 text-sm">Scalable solutions for large organizations</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-ecogo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-ecogo-600 text-2xl">precision_manufacturing</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Industrial IoT</h3>
              <p className="text-gray-600 text-sm">Connected solutions for industrial automation</p>
            </div>
          </div>

          {/* Industries Served */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Industries We Serve</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
              {['Travel & Tourism', 'Fire & Safety', 'Healthcare', 'Industrial', 'Retail'].map((industry, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-eva-500 to-ecogo-500 rounded-lg flex items-center justify-center mb-3">
                    <span className="text-white font-bold text-sm">{industry.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{industry}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Enterprise Leaders
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of businesses that rely on EVA's enterprise AI communication platform
              for mission-critical customer communications.
            </p>
          </div>

          {/* Enterprise Logos */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center opacity-60 mb-16">
            {['TechCorp', 'GlobalSoft', 'InnovateLab', 'DataFlow', 'CloudTech', 'NextGen'].map((company, index) => (
              <div key={index} className="text-center">
                <div className="w-24 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                  <span className="text-gray-500 font-semibold text-sm">{company}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-yellow-400 text-lg">star</span>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "The AI intelligence is remarkable. Our customer satisfaction scores increased by 40%
                after implementing their multi-domain AI system."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  SJ
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Sarah Johnson</h4>
                  <p className="text-gray-600 text-sm">CTO, TechCorp Solutions</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-yellow-400 text-lg">star</span>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "The confidence-based filtering ensures we never send incorrect information.
                The 98.7% accuracy rate speaks for itself."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  MC
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Michael Chen</h4>
                  <p className="text-gray-600 text-sm">Head of Operations, GlobalSoft</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-yellow-400 text-lg">star</span>
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">
                "The enterprise dashboard and analytics give us insights we never had before.
                ROI was positive within the first month."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                  ER
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Emily Rodriguez</h4>
                  <p className="text-gray-600 text-sm">VP Marketing, InnovateLab</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section id="pricing" className="py-24 bg-gradient-to-br from-eva-600 to-eva-800 text-white text-center">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            Ready to Transform Your
            <span className="block text-ecogo-300">Customer Communications?</span>
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-4xl mx-auto">
            Join the enterprise leaders who trust EVA's AI-powered communication platform.
            Start your free trial today and experience the difference intelligent automation makes.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <Link
              to="/login"
              className="bg-white text-eva-600 px-12 py-4 rounded-full font-bold hover:bg-white/90 transition-all transform hover:scale-105 text-lg shadow-xl flex items-center justify-center space-x-2"
            >
              <span className="material-symbols-outlined">login</span>
              <span>Login to Platform</span>
            </Link>
            <Link
              to="#about"
              className="bg-transparent border-2 border-white text-white px-12 py-4 rounded-full font-bold hover:bg-white/10 transition-all text-lg backdrop-blur-sm flex items-center justify-center space-x-2"
            >
              <span className="material-symbols-outlined">info</span>
              <span>Learn More</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-ecogo-300 mb-2">Secure Access</div>
              <div className="text-white/80">Enterprise authentication</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-ecogo-300 mb-2">24/7 Support</div>
              <div className="text-white/80">Professional assistance</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-ecogo-300 mb-2">99.9% Uptime</div>
              <div className="text-white/80">Reliable platform</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
