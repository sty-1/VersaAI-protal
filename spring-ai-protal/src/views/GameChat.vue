<template>
  <div class="game-chat">
    <div class="game-container">
      <!-- Start screen -->
      <div v-if="!isGameStarted" class="game-start">
        <div class="start-header">
          <HeartIcon class="start-heart" aria-hidden="true" />
          <h2>Persuasion Lab</h2>
          <p>Navigate complex emotional scenarios. Every word matters.</p>
        </div>
        <div class="start-input-area">
          <textarea
            v-model="angerReason"
            placeholder="Why is she upset? (optional)..."
            rows="3"
            aria-label="Reason for anger"
          ></textarea>
          <button class="start-btn" @click="startGame">
            <span>Begin</span>
            <svg class="start-arrow" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Game chat -->
      <div v-else class="chat-main">
        <div class="game-stats">
          <div class="stat-item forgiveness-stat">
            <div class="stat-label">
              <HeartIcon class="heart-icon" :class="{ 'beating': forgiveness >= 80 }" aria-hidden="true" />
              <span>Forgiveness</span>
            </div>
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: `${forgiveness}%` }"
                :class="{
                  'low': forgiveness < 30,
                  'medium': forgiveness >= 30 && forgiveness < 70,
                  'high': forgiveness >= 70
                }"
              ></div>
            </div>
            <span class="stat-value" :class="{
              'text-red': forgiveness < 30,
              'text-amber': forgiveness >= 30 && forgiveness < 70,
              'text-green': forgiveness >= 70
            }">{{ forgiveness }}%</span>
          </div>
          <div class="stat-divider" aria-hidden="true"></div>
          <div class="stat-item">
            <span class="stat-label">Round</span>
            <span class="stat-value">{{ currentRound }} / {{ MAX_ROUNDS }}</span>
          </div>
        </div>

        <div class="messages" ref="messagesRef">
          <ChatMessage
            v-for="(message, index) in currentMessages"
            :key="index"
            :message="message"
            :is-stream="isStreaming && index === currentMessages.length - 1"
          />
        </div>

        <div class="input-area">
          <textarea
            v-model="userInput"
            @keydown.enter.prevent="sendMessage()"
            placeholder="Type your response..."
            rows="1"
            ref="inputRef"
            :disabled="isGameOver"
            aria-label="Type response"
          ></textarea>
          <button
            class="send-btn"
            @click="sendMessage()"
            :disabled="isStreaming || !userInput.trim() || isGameOver"
            aria-label="Send message"
          >
            <PaperAirplaneIcon class="btn-icon" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- Game over overlay -->
      <transition name="overlay-fade">
        <div v-if="isGameOver" class="game-over" :class="{ 'success': forgiveness >= 100 }">
          <div class="game-over-content">
            <div class="result-icon" aria-hidden="true">
              <span v-if="forgiveness >= 100">🎉</span>
              <span v-else>😢</span>
            </div>
            <div class="result-text">{{ gameResult }}</div>
            <button class="restart-btn" @click="resetGame">Play Again</button>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { PaperAirplaneIcon, HeartIcon } from '@heroicons/vue/24/outline'
import ChatMessage from '../components/ChatMessage.vue'
import { chatAPI } from '../services/api'

const messagesRef = ref(null)
const inputRef = ref(null)
const userInput = ref('')
const isStreaming = ref(false)
const currentChatId = ref(null)
const currentMessages = ref([])
const angerReason = ref('')
const isGameStarted = ref(false)
const isGameOver = ref(false)
const gameResult = ref('')
const MAX_ROUNDS = 10
const currentRound = ref(0)
const forgiveness = ref(0)

const adjustTextareaHeight = () => {
  const textarea = inputRef.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

const startGame = async () => {
  isGameStarted.value = true
  isGameOver.value = false
  gameResult.value = ''
  currentChatId.value = Date.now().toString()
  currentMessages.value = []
  currentRound.value = 0
  forgiveness.value = 0

  const startPrompt = angerReason.value
    ? `Start the game. Your girlfriend is upset because: ${angerReason.value}`
    : 'Generate a random reason for her anger and start the game'

  await sendMessage(startPrompt)
}

const resetGame = () => {
  isGameStarted.value = false
  isGameOver.value = false
  gameResult.value = ''
  currentMessages.value = []
  angerReason.value = ''
  userInput.value = ''
  currentRound.value = 0
  forgiveness.value = 0
}

const sendMessage = async (content) => {
  if (isStreaming.value || (!content && !userInput.value.trim())) return

  const messageContent = content || userInput.value.trim()

  currentMessages.value.push({
    role: 'user',
    content: messageContent,
    timestamp: new Date()
  })

  if (!content) {
    userInput.value = ''
    adjustTextareaHeight()
    currentRound.value++
  }
  await scrollToBottom()

  const assistantMessage = { role: 'assistant', content: '', timestamp: new Date() }
  currentMessages.value.push(assistantMessage)
  isStreaming.value = true

  let accumulatedContent = ''

  try {
    const reader = await chatAPI.sendGameMessage(messageContent, currentChatId.value)
    const decoder = new TextDecoder('utf-8')

    while (true) {
      try {
        const { value, done } = await reader.read()
        if (done) break

        accumulatedContent += decoder.decode(value)

        const forgivenessMatch = accumulatedContent.match(/(?:Forgiveness|原谅值)[:：]\s*(\d+)/i)
        if (forgivenessMatch) {
          const newForgiveness = parseInt(forgivenessMatch[1])
          if (!isNaN(newForgiveness)) {
            forgiveness.value = Math.min(100, Math.max(0, newForgiveness))
            if (forgiveness.value >= 100) {
              isGameOver.value = true
              gameResult.value = 'You did it! She has forgiven you completely.'
            } else if (forgiveness.value <= 0) {
              isGameOver.value = true
              gameResult.value = 'Forgiveness dropped to zero. She is now even more upset...'
            }
          }
        }

        await nextTick(() => {
          const updatedMessage = { ...assistantMessage, content: accumulatedContent }
          const lastIndex = currentMessages.value.length - 1
          currentMessages.value.splice(lastIndex, 1, updatedMessage)
        })
        await scrollToBottom()
      } catch (readError) {
        console.error('Stream read error:', readError)
        break
      }
    }

    if (currentRound.value >= MAX_ROUNDS && !isGameOver.value) {
      isGameOver.value = true
      if (forgiveness.value >= 100) {
        gameResult.value = 'You won her over on the very last round!'
      } else {
        gameResult.value = `Round limit reached (${MAX_ROUNDS} rounds). Final forgiveness: ${forgiveness.value}%`
      }
    } else if ((accumulatedContent.includes('游戏结束') || accumulatedContent.includes('Game Over')) && !isGameOver.value) {
      isGameOver.value = true
      gameResult.value = accumulatedContent
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    assistantMessage.content = 'Sorry, an error occurred. Please try again.'
  } finally {
    isStreaming.value = false
    await scrollToBottom()
  }
}

onMounted(() => adjustTextareaHeight())
</script>

<style scoped lang="scss">
.game-chat {
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: var(--surface-page);
  overflow: hidden;

  .game-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    padding: var(--space-6) var(--space-8);
    position: relative;
    height: 100%;
  }

  /* ── Start Screen ──────────────────────────────────── */
  .game-start {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-10);

    .start-header {
      text-align: center;

      .start-heart {
        width: 64px;
        height: 64px;
        color: var(--color-error);
        margin-bottom: var(--space-4);
        animation: heartFloat 2s ease-in-out infinite;
      }

      h2 {
        font-size: var(--font-4xl);
        font-weight: var(--font-bold);
        color: var(--text-primary);
        margin-bottom: var(--space-2);
      }

      p {
        font-size: var(--font-lg);
        color: var(--text-secondary);
      }
    }

    .start-input-area {
      width: 100%;
      max-width: 500px;
      display: flex;
      flex-direction: column;
      gap: var(--space-4);

      textarea {
        width: 100%;
        padding: var(--space-4);
        border: 1px solid var(--input-border);
        border-radius: var(--input-radius);
        background: var(--input-bg);
        resize: none;
        font-family: inherit;
        font-size: var(--font-sm);
        line-height: 1.5;
        color: var(--text-primary);
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--input-border-focus);
          box-shadow: var(--input-shadow-focus);
        }

        &::placeholder { color: var(--text-muted); }
      }

      .start-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-6);
        background: var(--gradient-brand);
        color: var(--text-inverse);
        border: none;
        border-radius: var(--radius-lg);
        font-size: var(--font-lg);
        font-weight: var(--font-semibold);
        cursor: pointer;
        transition: all var(--transition-base);

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow-blue);
        }

        .start-arrow { width: 20px; height: 20px; transition: transform var(--transition-fast); }
        &:hover .start-arrow { transform: translateX(3px); }
      }
    }
  }

  /* ── Chat Main ─────────────────────────────────────── */
  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--surface-card);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-light);
    overflow: hidden;

    /* Game stats bar */
    .game-stats {
      display: flex;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-4) var(--space-6);
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      color: white;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);

      .stat-divider {
        width: 1px;
        height: 32px;
        background: rgba(255, 255, 255, 0.15);
      }

      .stat-item {
        display: flex;
        align-items: center;
        gap: var(--space-3);

        &.forgiveness-stat { flex: 1; }

        .stat-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--font-sm);
          font-weight: var(--font-medium);
          white-space: nowrap;

          .heart-icon {
            width: 20px;
            height: 20px;
            color: #ff4d4f;
            &.beating { animation: heartbeat 0.8s ease-in-out infinite; }
          }
        }

        .stat-value {
          font-size: var(--font-sm);
          font-weight: var(--font-semibold);
          min-width: 48px;
          text-align: right;

          &.text-red { color: #ff4d4f; }
          &.text-amber { color: #faad14; }
          &.text-green { color: #52c41a; }
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-full);
          overflow: hidden;
          min-width: 80px;

          .progress-fill {
            height: 100%;
            border-radius: var(--radius-full);
            transition: width 0.5s ease;

            &.low { background: #ff4d4f; }
            &.medium { background: linear-gradient(90deg, #faad14, #52c41a); }
            &.high { background: #52c41a; }
          }
        }
      }
    }

    .messages {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
    }

    .input-area {
      flex-shrink: 0;
      padding: var(--space-4) var(--space-6) var(--space-6);
      border-top: 1px solid var(--border-light);
      display: flex;
      gap: var(--space-3);
      align-items: flex-end;

      textarea {
        flex: 1;
        resize: none;
        border: 1px solid var(--input-border);
        background: var(--input-bg);
        border-radius: var(--input-radius);
        padding: var(--space-3) var(--space-4);
        color: var(--text-primary);
        font-family: inherit;
        font-size: var(--font-sm);
        line-height: 1.5;
        max-height: 120px;
        transition: border-color var(--transition-fast), box-shadow var(--transition-fast);

        &:focus {
          outline: none;
          border-color: var(--input-border-focus);
          box-shadow: var(--input-shadow-focus);
        }

        &:disabled {
          background: var(--surface-hover);
          cursor: not-allowed;
        }

        &::placeholder { color: var(--text-muted); }
      }

      .send-btn {
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: var(--radius-lg);
        background: var(--color-primary);
        color: var(--text-inverse);
        cursor: pointer;
        transition: all var(--transition-fast);
        flex-shrink: 0;

        &:hover:not(:disabled) {
          background: var(--color-primary-hover);
          transform: scale(1.05);
        }

        &:disabled {
          background: var(--border-default);
          cursor: not-allowed;
        }

        .btn-icon { width: 20px; height: 20px; }
      }
    }
  }

  /* ── Game Over Overlay ─────────────────────────────── */
  .game-over {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px);
    border-radius: var(--radius-xl);
    z-index: var(--z-overlay);

    .game-over-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-6);
      padding: var(--space-10) var(--space-12);
      background: var(--surface-card);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-xl);
      text-align: center;
      animation: popIn 0.4s ease-out;

      .result-icon {
        font-size: 3rem;
        animation: popIn 0.5s ease-out 0.1s both;
      }

      .result-text {
        font-size: var(--font-lg);
        color: var(--text-primary);
        font-weight: var(--font-medium);
        max-width: 320px;
        line-height: 1.6;
      }

      .restart-btn {
        padding: var(--space-3) var(--space-8);
        background: var(--gradient-brand);
        color: var(--text-inverse);
        border: none;
        border-radius: var(--radius-lg);
        font-size: var(--font-base);
        font-weight: var(--font-semibold);
        cursor: pointer;
        transition: all var(--transition-base);

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow-blue);
        }
      }
    }

    &.success {
      background: rgba(82, 196, 26, 0.15);

      .restart-btn {
        background: var(--gradient-success);
      }
    }
  }
}

/* Overlay transition */
.overlay-fade-enter-active { transition: opacity 0.3s ease; }
.overlay-fade-leave-active { transition: opacity 0.2s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to { opacity: 0; }

/* Animations */
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.25); }
  50% { transform: scale(1); }
  75% { transform: scale(1.15); }
}

@keyframes heartFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .game-chat .game-container {
    padding: var(--space-4);

    .game-start .start-header h2 { font-size: var(--font-2xl); }
    .chat-main .game-stats { padding: var(--space-3) var(--space-4); gap: var(--space-3); }
    .chat-main .messages { padding: var(--space-4); }
    .chat-main .input-area { padding: var(--space-3); }
  }
}
</style>
