import React, { useState, useEffect } from "react";
import axios from "axios";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { GoogleGenAI } from "@google/genai";

function App() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Informative");
  const [audience, setAudience] = useState("General audience");
  const [wordCount, setWordCount] = useState(1000);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [activeTab, setActiveTab] = useState("input");
  const [formattedContent, setFormattedContent] = useState("");

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  useEffect(() => {
    if (response) {
      setFormattedContent(formatContentWithHeadings(response));
    }
  }, [response]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      document.getElementById("topic-input").focus();
      return;
    }
  
    const prompt = `
  You are an expert blog writer and SEO strategist.
  
  Write a detailed, SEO-optimized blog post on the topic: "${topic}". 
  The blog should include:
  
  1. A compelling, SEO-friendly title
  2. A meta description under 160 characters
  3. A well-structured introduction
  4. Clear, concise H2/H3 subheadings
  5. Bullet points or numbered lists where useful
  6. Relevant keywords naturally integrated
  7. Internal links suggestions (optional)
  8. A short conclusion
  9. 3 SEO-friendly FAQs at the end using H3 tags
  
  Keep the tone ${tone} and make the content easy to understand for ${audience}. 
  Avoid fluff. Make it engaging, factual, and informative. Length: ~${wordCount} words.
  `.trim();
  
    try {
      setLoading(true);
      setActiveTab("output");
  
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey: apiKey });
  
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      });
  
      let text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      
      // Save the original content (with markdown) for the response
      setResponse(text);
    } catch (err) {
      console.error("Gemini API Error:", err);
      setResponse("Something went wrong. Please check your API key or try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to preserve formatting but make it HTML-safe
  const formatContentWithHeadings = (text) => {
    if (!text) return "";
    
    // Replace markdown headings with appropriate HTML tags
    let formattedText = text
      // Handle h1 (title)
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl sm:text-3xl font-bold mt-6 mb-4 text-slate-800">$1</h1>')
      // Handle h2
      .replace(/^## (.*$)/gm, '<h2 class="text-xl sm:text-2xl font-bold mt-5 mb-3 text-slate-800">$1</h2>')
      // Handle h3
      .replace(/^### (.*$)/gm, '<h3 class="text-lg sm:text-xl font-bold mt-4 mb-2 text-slate-700">$1</h3>')
      // Handle bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Handle italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Handle unordered lists
      .replace(/^\s*\*\s(.+)$/gm, '<li class="ml-4">$1</li>')
      // Handle ordered lists
      .replace(/^\s*\d+\.\s(.+)$/gm, '<li class="ml-4">$1</li>')
      // Handle paragraphs - add spacing
      .replace(/^([^<\s].+)$/gm, '<p class="mb-4">$1</p>');
    
    // Wrap unordered lists
    formattedText = formattedText.replace(/<li class="ml-4">(.*?)<\/li>\s*(?=<li class="ml-4">|<p|<h|$)/gs, function(match) {
      return '<ul class="list-disc ml-6 mb-4">' + match + '</ul>';
    });
    
    // Wrap ordered lists
    formattedText = formattedText.replace(/<li class="ml-4">(.*?)<\/li>\s*(?=<p|<h|$)/gs, function(match) {
      if (match.includes('<ul class=')) return match; // Already wrapped as unordered
      return '<ol class="list-decimal ml-6 mb-4">' + match + '</ol>';
    });
    
    return formattedText;
  };
  
  // Plain text formatter for download
  const formatResponseText = (text) => {
    if (!text) return text;
    
    // Leave the content as is for download/copy
    return text;
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
  };

  const downloadAsDocx = async () => {
    if (!response) return;
  
    // Split the content into lines or paragraphs
    const lines = response.split(/\n+/).filter(line => line.trim() !== "");
  
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: lines.map((line) => {
            // Detect headers (###, ##, #)
            if (line.startsWith("### ")) {
              return new Paragraph({
                text: line.replace(/^### /, ""),
                heading: "HEADING_3"
              });
            } else if (line.startsWith("## ")) {
              return new Paragraph({
                text: line.replace(/^## /, ""),
                heading: "HEADING_2"
              });
            } else if (line.startsWith("# ")) {
              return new Paragraph({
                text: line.replace(/^# /, ""),
                heading: "HEADING_1"
              });
            } else {
              return new Paragraph({
                children: [new TextRun(line)],
              });
            }
          }),
        },
      ],
    });
  
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.slice(0, 30)}-blog.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center px-2 sm:px-4 pb-8 sm:pb-16">
      
      {/* Header */}
      <header className="w-full max-w-6xl py-4 sm:py-8 px-3 sm:px-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-transparent bg-clip-text">BlogWriter AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Generate premium-quality, SEO-optimized content in seconds.</p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center gap-2 sm:gap-3">
          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 sm:px-3 py-1 rounded-full">
            🚀 Powered by Gemini
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-6xl">
        
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-xl sm:rounded-2xl border border-gray-100 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button 
              className={`flex-1 py-3 sm:py-4 text-sm sm:text-base font-medium text-center ${activeTab === 'input' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('input')}
            >
              <span className="flex items-center justify-center gap-1 sm:gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Content Settings
              </span>
            </button>
            <button 
              className={`flex-1 py-3 sm:py-4 text-sm sm:text-base font-medium text-center ${activeTab === 'output' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('output')}
            >
              <span className="flex items-center justify-center gap-1 sm:gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generated Content
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6 md:p-8">
            {activeTab === 'input' ? (
              <div className="space-y-4 sm:space-y-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">Generate Your Blog Content</h2>
                <p className="text-sm sm:text-base text-slate-500">Fill in the details below to create high-quality, SEO-optimized blog content tailored to your needs.</p>
                
                {/* Inputs */}
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Blog Topic*</label>
                    <input
                      id="topic-input"
                      type="text"
                      placeholder="e.g. 10 Essential Digital Marketing Strategies for 2025"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 text-sm sm:text-base"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Content Tone</label>
                      <select
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 text-sm sm:text-base"
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                      >
                        <option>Informative</option>
                        <option>Professional</option>
                        <option>Conversational</option>
                        <option>Authoritative</option>
                        <option>Friendly</option>
                        <option>Playful</option>
                        <option>Educational</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                      <input
                        type="text"
                        placeholder="e.g. Marketing professionals, Small business owners"
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 text-sm sm:text-base"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                      Word Count: {wordCount}
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="2000"
                      step="100"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      value={wordCount}
                      onChange={(e) => setWordCount(parseInt(e.target.value))}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>500</span>
                      <span className="hidden sm:inline">1000</span>
                      <span className="hidden sm:inline">1500</span>
                      <span>2000</span>
                    </div>
                  </div>
                </div>

                {/* Button */}
                <button
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Content...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Blog Content
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">Your Generated Content</h2>
                  {response && !loading && (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md sm:rounded-lg bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm font-medium text-slate-700 transition-all"
                      >
                        {copied ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                      <button 
                        onClick={downloadAsDocx}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md sm:rounded-lg bg-gray-100 hover:bg-gray-200 text-xs sm:text-sm font-medium text-slate-700 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-sm sm:text-base text-slate-600">Creating your premium content...</p>
                    <div className="mt-2 text-xs text-slate-500">This typically takes 15-30 seconds</div>
                  </div>
                ) : response ? (
                  <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                    <div 
                      className="prose prose-sm sm:prose prose-slate max-w-none text-gray-700 leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: formattedContent }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-4 text-sm sm:text-base">Your generated content will appear here</p>
                    <button 
                      onClick={() => setActiveTab('input')}
                      className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm sm:text-base flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full mt-8 sm:mt-12 py-6 sm:py-8 border-t border-blue-500">
        <div className="p-2 border-t bg-indigo-500 border-none flex flex-col md:flex-row justify-center items-center">
          <p className="text-xs sm:text-sm text-white">© {new Date().getFullYear()} <span className="font-medium text-white">BlogWriter AI</span>. Made by Zakariya Bukhari</p>
        </div>
      </footer>
    </div>
  );
}

export default App;