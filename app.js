:root {
  --bg: #f4f6fb;
  --card: #ffffff;
  --card2: #eef1f7;
  --text: #222222;
  --subtext: #6b7280;
  --border: #dfe3eb;
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --danger: #ef4444;
  --success: #22c55e;
  --shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

body.dark {
  --bg: #17131f;
  --card: #211b2b;
  --card2: #2d2439;
  --text: #c9b7ff;
  --subtext: #a990d4;
  --border: #433557;
  --primary: #8064d9;
  --primary-hover: #9279eb;
  --danger: #e8798b;
  --success: #73d49b;
  --shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family:
    "Nunito",
    "Pretendard",
    "Apple SD Gothic Neo",
    "Noto Sans KR",
    Arial,
    sans-serif;
  transition: background 0.2s, color 0.2s;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.hidden {
  display: none !important;
}

.topbar {
  height: 64px;
  background: var(--card);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 20;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
}

.topbar-left {
  gap: 10px;
}

.topbar-right {
  gap: 6px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
}

.nav-btn,
.icon-btn {
  border: none;
  background: transparent;
  color: var(--text);
  padding: 8px 12px;
  border-radius: 8px;
}

.nav-btn:hover,
.icon-btn:hover {
  background: var(--card2);
}

#mainContent {
  max-width: 900px;
  margin: 0 auto;
  padding: 28px 18px 50px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.page-title {
  margin: 0;
  font-size: 28px;
}

.page-description {
  margin: 6px 0 0;
  color: var(--subtext);
  font-size: 14px;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  border: none;
  border-radius: 10px;
  padding: 10px 15px;
  font-weight: 600;
}

.primary-btn {
  background: var(--primary);
  color: #fff;
}

.primary-btn:hover {
  background: var(--primary-hover);
}

.secondary-btn {
  background: var(--card2);
  color: var(--text);
}

.danger-btn {
  background: var(--danger);
  color: #fff;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 15px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow);
}

.drag-handle {
  color: var(--subtext);
  font-size: 18px;
  cursor: grab;
  user-select: none;
}

.item-main {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.item-title {
  font-weight: 700;
  font-size: 16px;
  word-break: break-word;
}

.item-sub {
  color: var(--subtext);
  font-size: 13px;
  margin-top: 4px;
}

.item-actions {
  display: flex;
  gap: 5px;
}

.small-btn {
  border: none;
  background: var(--card2);
  color: var(--text);
  padding: 7px 9px;
  border-radius: 8px;
  font-size: 13px;
}

.small-btn.delete {
  color: var(--danger);
}

.input-area {
  margin-bottom: 18px;
}

.word-input {
  width: 100%;
  height: 46px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  outline: none;
}

.word-input:focus {
  border-color: var(--primary);
}

.word-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.word-row {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.word-content {
  flex: 1;
  min-width: 0;
}

.word-term {
  font-weight: 700;
  word-break: break-word;
}

.word-meaning {
  color: var(--subtext);
  margin-top: 4px;
  word-break: break-word;
}

.word-actions {
  display: flex;
  gap: 5px;
  align-items: center;
}

.star-btn {
  border: none;
  background: transparent;
  font-size: 20px;
  padding: 3px;
}

.test-buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.test-btn {
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  border-radius: 10px;
  padding: 13px 12px;
  font-weight: 600;
}

.test-btn:hover {
  background: var(--card2);
}

.quiz-wrap {
  max-width: 680px;
  margin: 0 auto;
}

.quiz-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.quiz-progress {
  color: var(--subtext);
  font-size: 14px;
}

.quiz-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 28px 22px;
  box-shadow: var(--shadow);
}

.question-direction {
  text-align: center;
  color: var(--subtext);
  font-size: 14px;
}

.question {
  font-size: 30px;
  font-weight: 700;
  text-align: center;
  margin: 18px 0 28px;
  word-break: break-word;
}

.answer-input {
  width: 100%;
  height: 50px;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0 14px;
  background: var(--card);
  color: var(--text);
  outline: none;
}

.feedback {
  margin-top: 16px;
  min-height: 28px;
  text-align: center;
  font-weight: 700;
}

.feedback.correct {
  color: var(--success);
}

.feedback.wrong {
  color: var(--danger);
}

.quiz-next {
  width: 100%;
  margin-top: 14px;
}

.result-card {
  max-width: 620px;
  margin: 40px auto;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  padding: 28px;
  text-align: center;
}

.result-score {
  font-size: 40px;
  font-weight: 800;
  margin: 15px 0;
}

.result-detail {
  color: var(--subtext);
  margin-bottom: 25px;
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  box-shadow: var(--shadow);
}

.stat-label {
  color: var(--subtext);
  font-size: 13px;
}

.stat-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 800;
}

.history-group {
  margin-bottom: 20px;
}

.history-year,
.history-month {
  font-weight: 700;
  margin-bottom: 9px;
}

.history-year {
  font-size: 18px;
}

.history-month {
  font-size: 16px;
}

.history-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 11px 14px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}

.history-main {
  min-width: 0;
}

.history-name {
  font-weight: 600;
}

.history-sub {
  color: var(--subtext);
  font-size: 13px;
  margin-top: 4px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-item {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.settings-title {
  font-weight: 700;
  margin-bottom: 5px;
}

.settings-description {
  color: var(--subtext);
  font-size: 13px;
  margin-bottom: 12px;
}

.data-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.guide-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}

.guide-toggle {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text);
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  text-align: left;
}

.guide-content {
  display: none;
  padding: 0 16px 16px;
  color: var(--subtext);
  line-height: 1.7;
  font-size: 14px;
}

.guide-content.open {
  display: block;
}

.guide-line {
  margin: 8px 0;
}

.empty-state {
  background: var(--card);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 35px 20px;
  text-align: center;
  color: var(--subtext);
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  z-index: 100;
}

.modal-box {
  width: 100%;
  max-width: 440px;
  background: var(--card);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.modal-box.small {
  max-width: 380px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h3 {
  margin: 0;
}

.modal-input {
  width: 100%;
  height: 46px;
  padding: 0 13px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
  border-radius: 10px;
  outline: none;
}

.modal-input:focus {
  border-color: var(--primary);
}

.quick-options {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.quick-option {
  border: 1px solid var(--border);
  background: var(--card2);
  color: var(--text);
  padding: 14px;
  border-radius: 9px;
  text-align: left;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

@media (max-width: 700px) {
  .topbar {
    padding: 0 10px;
  }

  .logo {
    font-size: 17px;
  }

  .nav-btn {
    padding: 7px 8px;
    font-size: 13px;
  }

  #mainContent {
    padding: 22px 12px 40px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .test-buttons {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .question {
    font-size: 25px;
  }

  .history-item {
    flex-direction: column;
  }
}
