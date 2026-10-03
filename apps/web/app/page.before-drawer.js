"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = "http://127.0.0.1:4000";
const STORAGE_KEY = "vybe-ai-chats";
const ACTIVE_CHAT_KEY = "vybe-ai-active-chat";

function createChat() {
  return {
    id: Date.now().toString(),
    title: "New conversation",
    messages: [],
  };
}

export default function Home() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed);

          const savedActiveChatId =
            localStorage.getItem(ACTIVE_CHAT_KEY);

          const activeExists = parsed.some(
            (chat) => chat.id === savedActiveChatId
          );

          setActiveChatId(
            activeExists ? savedActiveChatId : parsed[0].id
          );
        } else {
          const chat = createChat();
          setChats([chat]);
          setActiveChatId(chat.id);
        }
      } else {
        const chat = createChat();
        setChats([chat]);
        setActiveChatId(chat.id);
      }
    } catch (error) {
      console.error("Could not load chats:", error);

      const chat = createChat();
      setChats([chat]);
      setActiveChatId(chat.id);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));

      if (activeChatId) {
        localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
      }
    }
  }, [chats, activeChatId, loaded]);

  const activeChat =
    chats.find((chat) => chat.id === activeChatId) || null;

  const messages = activeChat?.messages || [];

  function newChat() {
    const chat = createChat();

    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    localStorage.setItem(ACTIVE_CHAT_KEY, chat.id);
    setMessage("");
    setMenuOpen(false);
  }

  function selectChat(id) {
    setActiveChatId(id);
    setMessage("");
    setMenuOpen(false);
  }

  function deleteChat(id) {
    const remaining = chats.filter((chat) => chat.id !== id);

    if (remaining.length === 0) {
      const chat = createChat();
      setChats([chat]);
      setActiveChatId(chat.id);
      return;
    }

    setChats(remaining);

    if (id === activeChatId) {
      setActiveChatId(remaining[0].id);
    }
  }

  function updateMessages(chatId, newMessages) {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: newMessages,
            }
          : chat
      )
    );
  }

  async function sendMessage(text = message) {
    const value = text.trim();

    if (!value || loading || !activeChat) return;

    const chatId = activeChat.id;

    const updatedMessages = [
      ...activeChat.messages,
      {
        role: "user",
        content: value,
      },
    ];

    setMessage("");

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title:
                chat.messages.length === 0
                  ? value.slice(0, 35)
                  : chat.title,
              messages: updatedMessages,
            }
          : chat
      )
    );

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "AI request failed");
      }

      updateMessages(chatId, [
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      console.error(error);

      updateMessages(chatId, [
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't connect to VYBE AI. Please make sure the API server is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    sendMessage();
  }

  const suggestions = [
    "Build a website",
    "Explain something",
    "Debug code",
    "Brainstorm ideas",
  ];

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-logo">V</div>

          <button
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <div>
            <strong>VYBE AI</strong>
            <span>AI Assistant</span>
          </div>
        </div>

        <button className="new-chat" onClick={newChat}>
          <span>＋</span>
          New chat
        </button>

        <div className="sidebar-section">
          <small>Conversations</small>

          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`conversation ${
                chat.id === activeChatId ? "active" : ""
              }`}
            >
              <button
                className="conversation-main"
                onClick={() => selectChat(chat.id)}
              >
                <span>💬</span>
                <span className="conversation-title">
                  {chat.title}
                </span>
              </button>

              <button
                className="delete-chat"
                onClick={() => deleteChat(chat.id)}
                title="Delete conversation"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          className="mobile-close-button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>

        <div className="sidebar-bottom">
          <button>⚙️ Settings</button>
          <button>❓ Help</button>
        </div>
      </aside>

      {menuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`mobile-drawer ${menuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <div className="brand">
            <div className="brand-logo">V</div>
            <div>
              <strong>VYBE AI</strong>
              <span>AI Assistant</span>
            </div>
          </div>

          <button
            className="close-menu"
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <button className="new-chat mobile-new-chat" onClick={newChat}>
          <span>＋</span>
          New chat
        </button>

        <div className="mobile-conversations">
          <small>Conversations</small>

          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`conversation ${
                chat.id === activeChatId ? "active" : ""
              }`}
            >
              <button
                className="conversation-main"
                onClick={() => selectChat(chat.id)}
              >
                <span>💬</span>
                <span className="conversation-title">
                  {chat.title}
                </span>
              </button>

              <button
                className="delete-chat"
                onClick={() => deleteChat(chat.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="mobile-drawer-bottom">
          <button>⚙️ Settings</button>
          <button>❓ Help</button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="chat-area">
        <header className="chat-header">
          <button
            className="menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>

          <button
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>

          <div>
            <strong>VYBE AI</strong>
            <span>AI Assistant</span>
          </div>

          <button className="model-button">
            VYBE AI <span>⌄</span>
          </button>
        </header>

        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-logo">V</div>

              <h1>How can I help?</h1>

              <p>
                Ask VYBE AI anything. Build, learn, debug,
                brainstorm and create.
              </p>

              <div className="suggestions">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                    <span>→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((item, index) => (
                <div
                  key={index}
                  className={`message ${
                    item.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >
                  <div className="message-label">
                    {item.role === "user" ? "You" : "VYBE AI"}
                  </div>

                  <div className="message-content">
                    {item.role === "assistant" ? (
                      <ReactMarkdown>
                        {item.content}
                      </ReactMarkdown>
                    ) : (
                      item.content
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message assistant-message">
                  <div className="message-label">VYBE AI</div>

                  <div className="message-content typing">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="composer-wrapper">
          <form className="composer" onSubmit={handleSubmit}>
            <button type="button" className="plus-button">
              ＋
            </button>

            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Message VYBE AI..."
              disabled={loading}
            />

            <button
              type="submit"
              className="send-button"
              disabled={!message.trim() || loading}
            >
              ↑
            </button>
          </form>

          <p className="disclaimer">
            VYBE AI can make mistakes. Check important information.
          </p>
        </div>
      </section>
    </main>
  );
}
