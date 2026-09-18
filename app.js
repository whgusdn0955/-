<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#7c3aed">
    <meta name="description" content="간편하고 직관적인 단어 암기 앱">

    <title>단어장</title>

    <link rel="stylesheet" href="style.css">
    <link rel="manifest" href="manifest.json">
</head>

<body>
    <div id="app">

        <!-- ==================== 헤더 ==================== -->
        <header class="app-header">
            <div class="header-inner">

                <button
                    id="mobileMenuButton"
                    class="icon-button mobile-only"
                    aria-label="메뉴"
                >
                    ☰
                </button>

                <button
                    id="headerHomeButton"
                    class="app-title-button"
                >
                    <span class="app-logo">📚</span>
                    <span class="app-title">단어장</span>
                </button>

                <div class="header-actions">
                    <button
                        id="headerThemeButton"
                        class="icon-button"
                        aria-label="테마 변경"
                    >
                        🌙
                    </button>
                </div>

            </div>
        </header>


        <!-- ==================== 메인 레이아웃 ==================== -->
        <div class="app-layout">

            <!-- ==================== 사이드바 ==================== -->
            <aside id="sidebar" class="sidebar">

                <nav class="main-navigation">

                    <button
                        class="nav-item active"
                        data-page="home"
                    >
                        <span class="nav-icon">🏠</span>
                        <span>홈</span>
                    </button>

                    <button
                        class="nav-item"
                        data-page="statistics"
                    >
                        <span class="nav-icon">📊</span>
                        <span>기록</span>
                    </button>

                    <button
                        class="nav-item"
                        data-page="settings"
                    >
                        <span class="nav-icon">⚙️</span>
                        <span>설정</span>
                    </button>

                </nav>

            </aside>


            <!-- ==================== 콘텐츠 ==================== -->
            <main id="mainContent" class="main-content">


                <!-- ==================== 홈 ==================== -->
                <section
                    id="homePage"
                    class="page active"
                >

                    <div class="page-header">

                        <div>
                            <h1>내 단어장</h1>
                            <p>
                                파일과 단어장을 관리해보세요.
                            </p>
                        </div>

                        <button
                            id="addFileButton"
                            class="primary-button"
                        >
                            <span>＋</span>
                            파일 추가
                        </button>

                    </div>


                    <div
                        id="fileList"
                        class="file-list"
                    >
                        <!-- JavaScript에서 생성 -->
                    </div>


                    <div
                        id="emptyFileState"
                        class="empty-state hidden"
                    >

                        <div class="empty-icon">
                            📚
                        </div>

                        <h2>
                            아직 파일이 없습니다.
                        </h2>

                        <p>
                            새로운 파일을 만들어
                            단어 공부를 시작해보세요.
                        </p>

                        <button
                            id="emptyAddFileButton"
                            class="primary-button"
                        >
                            ＋ 첫 파일 만들기
                        </button>

                    </div>

                </section>


                <!-- ==================== 파일 상세 ==================== -->
                <section
                    id="filePage"
                    class="page"
                >

                    <div class="breadcrumb">

                        <button
                            id="backToHomeButton"
                            class="breadcrumb-button"
                        >
                            🏠 홈
                        </button>

                        <span>›</span>

                        <span id="currentFileBreadcrumb">
                            파일
                        </span>

                    </div>


                    <div class="page-header">

                        <div>
                            <h1 id="currentFileTitle">
                                파일
                            </h1>

                            <p id="currentFileDescription">
                                단어장을 관리하세요.
                            </p>
                        </div>


                        <div class="button-group">

                            <button
                                id="fileTestButton"
                                class="secondary-button"
                            >
                                📝 일반 테스트
                            </button>

                            <button
                                id="addWorkbookButton"
                                class="primary-button"
                            >
                                ＋ 단어장 추가
                            </button>

                        </div>

                    </div>


                    <div
                        id="workbookList"
                        class="workbook-list"
                    >
                        <!-- JavaScript에서 생성 -->
                    </div>


                    <div
                        id="emptyWorkbookState"
                        class="empty-state hidden"
                    >

                        <div class="empty-icon">
                            📖
                        </div>

                        <h2>
                            아직 단어장이 없습니다.
                        </h2>

                        <p>
                            새로운 단어장을 만들어보세요.
                        </p>

                        <button
                            id="emptyAddWorkbookButton"
                            class="primary-button"
                        >
                            ＋ 단어장 만들기
                        </button>

                    </div>

                </section>


                <!-- ==================== 단어장 상세 ==================== -->
                <section
                    id="workbookPage"
                    class="page"
                >

                    <div class="breadcrumb">

                        <button
                            id="backToFileButton"
                            class="breadcrumb-button"
                        >
                            📁 파일
                        </button>

                        <span>›</span>

                        <span id="currentWorkbookBreadcrumb">
                            단어장
                        </span>

                    </div>


                    <div class="page-header">

                        <div>

                            <h1 id="currentWorkbookTitle">
                                단어장
                            </h1>

                            <p id="wordCountDescription">
                                0개의 단어
                            </p>

                        </div>


                        <button
                            id="addWordButton"
                            class="primary-button"
                        >
                            📝 단어 테스트
                        </button>

                    </div>


                    <!-- ==================== 일반 단어 입력 ==================== -->
                    <div
                        id="normalWordInputCard"
                        class="input-card"
                    >

                        <div class="input-card-header">

                            <div>

                                <h2>
                                    단어 빠르게 추가
                                </h2>

                                <p>
                                    예: apple:사과,과일 / banana:바나나
                                </p>

                            </div>

                        </div>


                        <div class="bulk-input-area">

                            <textarea
                                id="bulkWordInput"
                                rows="4"
                                placeholder="영어:뜻,뜻 / 영어:뜻"
                                autocomplete="off"
                                spellcheck="false"
                            ></textarea>


                            <button
                                id="bulkAddWordButton"
                                class="primary-button"
                            >
                                단어 추가
                            </button>

                        </div>


                        <div class="input-help">

                            <span>
                                <code>:</code>
                                단어와 뜻 구분
                            </span>

                            <span>
                                <code>,</code>
                                여러 뜻 구분
                            </span>

                            <span>
                                <code>/</code>
                                여러 단어 입력
                            </span>

                        </div>

                    </div>


                    <!-- ==================== 한자 / 일본어 전용 영역 ==================== -->
                    <div
                        id="specialWorkbookPanel"
                        class="settings-card special-workbook-panel hidden"
                    >

                        <div class="settings-card-title">

                            <span class="settings-icon">
                                📚
                            </span>

                            <div>

                                <h2 id="specialWorkbookTitle">
                                    특수 학습
                                </h2>

                                <p id="specialWorkbookDescription">
                                    내장 학습 자료입니다.
                                </p>

                            </div>

                        </div>


                        <!-- 한자 급수 -->
                        <div
                            id="specialLevelArea"
                            class="special-level-area hidden"
                        >

                            <h3>
                                급수 선택
                            </h3>

                            <div
                                id="specialLevelList"
                                class="special-level-list"
                            ></div>

                        </div>


                        <!-- 일본어 안내 -->
                        <div
                            id="specialJapaneseInfo"
                            class="special-info hidden"
                        >

                            <strong>
                                일본어 학습
                            </strong>

                            <span>
                                뜻은 사용하지 않고
                                한자의 음독·훈독만 학습합니다.
                            </span>

                        </div>


                        <!-- 검색 -->
                        <div
                            id="specialSearchArea"
                            class="special-search-area"
                        >

                            <input
                                id="specialSearch"
                                type="search"
                                placeholder="한자·뜻·음 검색"
                                autocomplete="off"
                            >

                        </div>


                        <!-- 목록 헤더 -->
                        <div class="special-list-header">

                            <h3 id="specialListTitle">
                                학습 목록
                            </h3>

                            <button
                                id="specialTestButton"
                                class="primary-button"
                                type="button"
                            >
                                📝 테스트
                            </button>

                        </div>


                        <!-- 특수 학습 목록 -->
                        <div
                            id="specialList"
                            class="special-list"
                        ></div>

                    </div>


                    <!-- ==================== 단어 목록 ==================== -->
                    <div class="section-header">

                        <div>

                            <h2>
                                단어 목록
                            </h2>

                            <span id="wordListCount">
                                0개
                            </span>

                        </div>

                    </div>


                    <div
                        id="wordList"
                        class="word-list"
                    >
                        <!-- JavaScript에서 생성 -->
                    </div>


                    <div
                        id="emptyWordState"
                        class="empty-state hidden"
                    >

                        <div class="empty-icon">
                            ✏️
                        </div>

                        <h2>
                            아직 단어가 없습니다.
                        </h2>

                        <p>
                            위 입력창에서 단어를 추가해보세요.
                        </p>

                    </div>

                </section>


                <!-- ==================== 기록 ==================== -->
                <section
                    id="statisticsPage"
                    class="page"
                >

                    <div class="page-header">

                        <div>

                            <h1>
                                기록
                            </h1>

                            <p>
                                지금까지의 테스트 기록을 확인할 수 있습니다.
                            </p>

                        </div>

                    </div>


                    <div
                        id="statisticsSummary"
                        class="statistics-summary"
                    >
                        <!-- JavaScript에서 생성 -->
                    </div>


                    <div
                        id="statisticsList"
                        class="statistics-list"
                    >
                        <!-- JavaScript에서 생성 -->
                    </div>


                    <div
                        id="emptyStatisticsState"
                        class="empty-state hidden"
                    >

                        <div class="empty-icon">
                            📊
                        </div>

                        <h2>
                            아직 테스트 기록이 없습니다.
                        </h2>

                        <p>
                            단어 테스트를 완료하면
                            기록이 여기에 표시됩니다.
                        </p>

                    </div>

                </section>


                <!-- ==================== 설정 ==================== -->
                <section
                    id="settingsPage"
                    class="page"
                >

                    <div class="page-header">

                        <div>

                            <h1>
                                설정
                            </h1>

                            <p>
                                앱 환경과 데이터를 관리하세요.
                            </p>

                        </div>

                    </div>


                    <!-- ==================== 테마 ==================== -->
                    <div class="settings-card">

                        <div class="settings-card-title">

                            <span class="settings-icon">
                                🎨
                            </span>

                            <div>

                                <h2>
                                    테마
                                </h2>

                                <p>
                                    앱의 화면 테마를 설정합니다.
                                </p>

                            </div>

                        </div>


                        <div class="settings-row">

                            <div>

                                <strong>
                                    다크 모드
                                </strong>

                                <p>
                                    어두운 화면을 사용합니다.
                                </p>

                            </div>


                            <label class="switch">

                                <input
                                    type="checkbox"
                                    id="darkModeToggle"
                                >

                                <span class="slider"></span>

                            </label>

                        </div>

                    </div>


                    <!-- ==================== 테스트 시간 ==================== -->
                    <div class="settings-card">

                        <div class="settings-card-title">

                            <span class="settings-icon">
                                ⏱️
                            </span>

                            <div>

                                <h2>
                                    테스트 시간
                                </h2>

                                <p>
                                    한 문제를 풀 수 있는 시간을 설정합니다.
                                </p>

                            </div>

                        </div>


                        <div class="settings-row">

                            <div>

                                <strong>
                                    문제당 제한 시간
                                </strong>

                                <p>
                                    테스트 문제마다 적용됩니다.
                                </p>

                            </div>


                            <select id="testTimeSelect">

                                <option value="5">
                                    5초
                                </option>

                                <option value="10">
                                    10초
                                </option>

                                <option value="15">
                                    15초
                                </option>

                                <option value="20">
                                    20초
                                </option>

                                <option value="30">
                                    30초
                                </option>

                                <option value="60">
                                    60초
                                </option>

                            </select>

                        </div>

                    </div>


                    <!-- ==================== 데이터 ==================== -->
                    <div class="settings-card">

                        <div class="settings-card-title">

                            <span class="settings-icon">
                                💾
                            </span>

                            <div>

                                <h2>
                                    데이터
                                </h2>

                                <p>
                                    단어장 데이터를 안전하게 보관할 수 있습니다.
                                </p>

                            </div>

                        </div>


                        <div class="settings-actions">

                            <button
                                id="exportDataButton"
                                class="secondary-button"
                            >
                                📤 데이터 내보내기
                            </button>


                            <button
                                id="importDataButton"
                                class="secondary-button"
                            >
                                📥 데이터 가져오기
                            </button>


                            <input
                                type="file"
                                id="importFileInput"
                                accept=".json,application/json"
                                hidden
                            >

                        </div>

                    </div>


                    <!-- ==================== 사용 방법 ==================== -->
                    <div class="settings-card">

                        <button
                            id="usageGuideButton"
                            class="collapsible-header"
                        >

                            <div class="settings-card-title">

                                <span class="settings-icon">
                                    ❓
                                </span>

                                <div>

                                    <h2>
                                        사용 방법
                                    </h2>

                                    <p>
                                        앱의 주요 기능을 확인합니다.
                                    </p>

                                </div>

                            </div>


                            <span id="usageGuideArrow">
                                ⌄
                            </span>

                        </button>


                        <div
                            id="usageGuideContent"
                            class="collapsible-content hidden"
                        >

                            <!-- JavaScript에서 버전에 맞는 안내를 생성 -->

                        </div>

                    </div>


                    <!-- ==================== 버전 ==================== -->
                    <div class="settings-card">

                        <div class="settings-card-title">

                            <span class="settings-icon">
                                ℹ️
                            </span>

                            <div>

                                <h2>
                                    앱 정보
                                </h2>

                                <p>
                                    현재 설치된 앱의 버전입니다.
                                </p>

                            </div>

                        </div>


                        <div class="settings-row">

                            <strong>
                                버전
                            </strong>

                            <span id="appVersion">
                                1.1.0
                            </span>

                        </div>

                    </div>

                </section>


                <!-- ==================== 테스트 ==================== -->
                <section
                    id="testPage"
                    class="page"
                >

                    <div class="test-header">

                        <div class="test-progress">

                            <span id="testQuestionNumber">
                                1
                            </span>

                            <span>
                                /
                            </span>

                            <span id="testTotalQuestions">
                                10
                            </span>

                        </div>


                        <div class="timer-container">

                            <span>
                                ⏱️
                            </span>

                            <strong id="testTimer">
                                10
                            </strong>

                        </div>

                    </div>


                    <div class="test-card">

                        <div
                            id="testTypeLabel"
                            class="test-type-label"
                        >
                            영어 → 뜻
                        </div>


                        <div
                            id="testQuestion"
                            class="test-question"
                        >
                            apple
                        </div>


                        <!-- 직접 입력 -->
                        <input
                            type="text"
                            id="testAnswerInput"
                            class="test-answer-input"
                            placeholder="정답을 입력하세요"
                            autocomplete="off"
                            spellcheck="false"
                        >


                        <!-- 4지선다 -->
                        <div
                            id="testChoiceArea"
                            class="test-choice-area hidden"
                        ></div>


                        <!-- 채점 결과 -->
                        <div
                            id="testFeedback"
                            class="test-feedback hidden"
                        >
                            <!-- JavaScript에서 생성 -->
                        </div>


                        <button
                            id="testSubmitButton"
                            class="primary-button test-submit-button"
                        >
                            확인
                        </button>

                    </div>


                    <div class="test-hint">
                        Enter를 눌러 답을 제출할 수 있습니다.
                    </div>

                </section>


                <!-- ==================== 테스트 결과 ==================== -->
                <section
                    id="resultPage"
                    class="page"
                >

                    <div class="result-container">

                        <div class="result-icon">
                            🎉
                        </div>


                        <h1>
                            테스트 완료!
                        </h1>


                        <p id="resultTestName">
                            테스트 결과입니다.
                        </p>


                        <div class="result-score-card">

                            <div class="result-score">

                                <span id="resultCorrect">
                                    0
                                </span>

                                <small>
                                    정답
                                </small>

                            </div>


                            <div class="result-divider"></div>


                            <div class="result-score">

                                <span id="resultWrong">
                                    0
                                </span>

                                <small>
                                    오답
                                </small>

                            </div>


                            <div class="result-divider"></div>


                            <div class="result-score">

                                <span id="resultTotal">
                                    0
                                </span>

                                <small>
                                    전체
                                </small>

                            </div>

                        </div>


                        <div class="result-actions">

                            <button
                                id="resultHomeButton"
                                class="primary-button"
                            >
                                🏠 홈으로
                            </button>


                            <button
                                id="resultBackButton"
                                class="secondary-button"
                            >
                                📖 단어장으로
                            </button>


                            <button
                                id="retryWrongButton"
                                class="secondary-button"
                            >
                                🔄 틀린 문제 다시 풀기
                            </button>

                        </div>

                    </div>

                </section>

            </main>

        </div>


        <!-- ==================== 모달 ==================== -->
        <div
            id="modalOverlay"
            class="modal-overlay hidden"
        >

            <div
                id="modal"
                class="modal"
            >

                <div class="modal-header">

                    <h2 id="modalTitle">
                        제목
                    </h2>


                    <button
                        id="modalCloseButton"
                        class="modal-close-button"
                    >
                        ×
                    </button>

                </div>


                <div
                    id="modalBody"
                    class="modal-body"
                >
                    <!-- JavaScript에서 생성 -->
                </div>


                <div
                    id="modalFooter"
                    class="modal-footer"
                >
                    <!-- JavaScript에서 생성 -->
                </div>

            </div>

        </div>


        <!-- ==================== 토스트 ==================== -->
        <div
            id="toastContainer"
            class="toast-container"
        ></div>


        <!-- ==================== 모바일 하단 네비게이션 ==================== -->
        <nav class="mobile-navigation">

            <button
                class="mobile-nav-item active"
                data-page="home"
            >
                <span>🏠</span>
                <small>홈</small>
            </button>


            <button
                class="mobile-nav-item"
                data-page="statistics"
            >
                <span>📊</span>
                <small>기록</small>
            </button>


            <button
                class="mobile-nav-item"
                data-page="settings"
            >
                <span>⚙️</span>
                <small>설정</small>
            </button>

        </nav>

    </div>


    <!-- ==================== JavaScript ==================== -->
    <script src="app.js"></script>

</body>
</html>
