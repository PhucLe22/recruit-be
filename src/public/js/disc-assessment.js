const questions = [
    {
        id: 1,
        text: "Trong các cuộc họp, tôi thường:",
        options: [
            { text: "Dẫn dắt cuộc thảo luận và đưa ra quyết định nhanh chóng", icon: "fa-gavel", value: "D" },
            { text: "Thuyết phục và tạo năng lượng cho nhóm", icon: "fa-comments", value: "I" },
            { text: "Lắng nghe và hỗ trợ sự đồng thuận", icon: "fa-handshake", value: "S" },
            { text: "Phân tích dữ liệu và đảm bảo tính chính xác", icon: "fa-chart-line", value: "C" }
        ]
    },
    {
        id: 2,
        text: "Khi đối mặt với thách thức mới, tôi:",
        options: [
            { text: "Tiếp cận một cách quyết đoán và hành động ngay lập tức", icon: "fa-rocket", value: "D" },
            { text: "Tìm kiếm sự hỗ trợ và ý kiến từ người khác", icon: "fa-users", value: "I" },
            { text: "Lên kế hoạch cẩn thận từng bước một", icon: "fa-list-check", value: "C" },
            { text: "Duy trì phương pháp hiện tại đã được chứng minh", icon: "fa-shield-alt", value: "S" }
        ]
    },
    {
        id: 3,
        text: "Phong cách giao tiếp của tôi là:",
        options: [
            { text: "Thẳng thắn, tập trung vào kết quả", icon: "fa-bullseye", value: "D" },
            { text: "Nhiệt tình, truyền cảm hứng", icon: "fa-fire", value: "I" },
            { text: "Hỗ trợ, đồng cảm", icon: "fa-heart", value: "S" },
            { text: "Chính xác, logic", icon: "fa-brain", value: "C" }
        ]
    },
    {
        id: 4,
        text: "Khi làm việc nhóm, tôi thường:",
        options: [
            { text: "Đảm bảo nhóm đi đúng hướng và đạt mục tiêu", icon: "fa-compass", value: "D" },
            { text: "Khuyến khích sự sáng tạo và ý tưởng mới", icon: "fa-lightbulb", value: "I" },
            { text: "Giúp hòa giải xung đột và duy trì hòa khí", icon: "fa-dove", value: "S" },
            { text: "Cung cấp thông tin chi tiết và phân tích", icon: "fa-microscope", value: "C" }
        ]
    },
    {
        id: 5,
        text: "Phản ứng của tôi với áp lực thời gian là:",
        options: [
            { text: "Làm việc hiệu quả hơn và đưa ra quyết định nhanh", icon: "fa-tachometer-alt", value: "D" },
            { text: "Tập trung vào ưu tiên và giao việc cho người khác", icon: "fa-tasks", value: "I" },
            { text: "Duy trì bình tĩnh và làm việc có phương pháp", icon: "fa-spa", value: "S" },
            { text: "Kiểm tra kỹ lưỡng để tránh sai sót", icon: "fa-search", value: "C" }
        ]
    },
    {
        id: 6,
        text: "Khi xử lý xung đột, tôi:",
        options: [
            { text: "Đối mặt trực tiếp và giải quyết nhanh chóng", icon: "fa-fist-raised", value: "D" },
            { text: "Tìm kiếm giải pháp win-win qua đàm phán", icon: "fa-balance-scale", value: "I" },
            { text: "Tránh đối đầu và tìm cách hòa giải", icon: "fa-peace", value: "S" },
            { text: "Phân tích nguyên nhân gốc rễ", icon: "fa-search-plus", value: "C" }
        ]
    },
    {
        id: 7,
        text: "Môi trường làm việc lý tưởng của tôi là:",
        options: [
            { text: "Nhanh nhạy, cạnh tranh, tập trung kết quả", icon: "fa-trophy", value: "D" },
            { text: "Sáng tạo, hợp tác, đầy năng lượng", icon: "fa-palette", value: "I" },
            { text: "Ổn định, hỗ trợ, thân thiện", icon: "fa-home", value: "S" },
            { text: "Có cấu trúc, logic, chất lượng cao", icon: "fa-building", value: "C" }
        ]
    },
    {
        id: 8,
        text: "Khi nhận phản hồi, tôi:",
        options: [
            { text: "Đánh giá nhanh và hành động ngay lập tức", icon: "fa-bolt", value: "D" },
            { text: "Lắng nghe cởi mở và thảo luận", icon: "fa-comments", value: "I" },
            { text: "Cân nhắc kỹ và phản ứng thận trọng", icon: "fa-scale-balanced", value: "S" },
            { text: "Yêu cầu thông tin chi tiết và cụ thể", icon: "fa-clipboard-list", value: "C" }
        ]
    },
    {
        id: 9,
        text: "Điểm mạnh lớn nhất của tôi là:",
        options: [
            { text: "Khả năng lãnh đạo và ra quyết định", icon: "fa-crown", value: "D" },
            { text: "Kỹ năng giao tiếp và truyền cảm hứng", icon: "fa-megaphone", value: "I" },
            { text: "Sự kiên nhẫn và đáng tin cậy", icon: "fa-user-check", value: "S" },
            { text: "Sự chính xác và chú trọng chi tiết", icon: "fa-gem", value: "C" }
        ]
    },
    {
        id: 10,
        text: "Khi bắt đầu dự án mới, tôi:",
        options: [
            { text: "Thiết lập mục tiêu rõ ràng và đường lối", icon: "fa-flag", value: "D" },
            { text: "Xây dựng enthusiasm và sự hỗ trợ", icon: "fa-hands-helping", value: "I" },
            { text: "Thu thập thông tin và lập kế hoạch chi tiết", icon: "fa-clipboard", value: "C" },
            { text: "Theo quy trình đã được thiết lập", icon: "fa-cogs", value: "S" }
        ]
    },
    {
        id: 11,
        text: "Phong cách ra quyết định của tôi:",
        options: [
            { text: "Nhanh chóng, quyết đoán, chấp nhận rủi ro", icon: "fa-dice", value: "D" },
            { text: "Dựa trên con người và cảm xúc", icon: "fa-smile", value: "I" },
            { text: "Thận trọng, tìm kiếm sự đồng thuận", icon: "fa-users-cog", value: "S" },
            { text: "Phân tích sâu, dựa trên dữ liệu", icon: "fa-database", value: "C" }
        ]
    },
    {
        id: 12,
        text: "Khi giao tiếp với cấp trên, tôi:",
        options: [
            { text: "Trực tiếp, tự tin, thách thức khi cần", icon: "fa-arrow-up", value: "D" },
            { text: "Nhiệt tình, xây dựng mối quan hệ tốt", icon: "fa-handshake-alt", value: "I" },
            { text: "Tôn trọng, tôn trọng quyền hạn", icon: "fa-user-tie", value: "S" },
            { text: "Cung cấp thông tin chính xác, đầy đủ", icon: "fa-file-alt", value: "C" }
        ]
    },
    {
        id: 13,
        text: "Trong các tình huống thay đổi, tôi:",
        options: [
            { text: "Nắm bắt cơ hội và dẫn dắt sự thay đổi", icon: "fa-random", value: "D" },
            { text: "Adapt nhanh và truyền năng lượng tích cực", icon: "fa-sync-alt", value: "I" },
            { text: "Cần thời gian để thích nghi", icon: "fa-hourglass-half", value: "S" },
            { text: "Yêu cầu lý do và kế hoạch chi tiết", icon: "fa-question-circle", value: "C" }
        ]
    },
    {
        id: 14,
        text: "Khi đánh giá thành công, tôi tập trung vào:",
        options: [
            { text: "Kết quả cuối cùng và sự hiệu quả", icon: "fa-chart-bar", value: "D" },
            { text: "Sự công nhận và relationships", icon: "fa-award", value: "I" },
            { text: "Sự ổn định và hài lòng của nhóm", icon: "fa-smile-beam", value: "S" },
            { text: "Chất lượng và sự chính xác", icon: "fa-medal", value: "C" }
        ]
    },
    {
        id: 15,
        text: "Phong cách học hỏi của tôi là:",
        options: [
            { text: "Học qua thực hành và thử nghiệm", icon: "fa-flask", value: "D" },
            { text: "Học qua tương tác và thảo luận", icon: "fa-graduation-cap", value: "I" },
            { text: "Học qua quan sát và thực hành có hướng dẫn", icon: "fa-eye", value: "S" },
            { text: "Học qua nghiên cứu và phân tích chi tiết", icon: "fa-book", value: "C" }
        ]
    },
    {
        id: 16,
        text: "Khi đối mặt với thất bại, tôi:",
        options: [
            { text: "Nhanh chóng chuyển hướng và tìm giải pháp mới", icon: "fa-redo", value: "D" },
            { text: "Tìm kiếm sự hỗ trợ và động viên", icon: "fa-hands", value: "I" },
            { text: "Phân tích cẩn thận và rút kinh nghiệm", icon: "fa-microscope", value: "S" },
            { text: "Kiểm tra lại quy trình và cải thiện", icon: "fa-tools", value: "C" }
        ]
    },
    {
        id: 17,
        text: "Khi quản lý thời gian, tôi:",
        options: [
            { text: "Ưu tiên các tác vụ quan trọng nhất", icon: "fa-calendar-check", value: "D" },
            { text: "Linh hoạt và thích ứng với thay đổi", icon: "fa-clock", value: "I" },
            { text: "Làm theo lịch trình cố định", icon: "fa-calendar-alt", value: "S" },
            { text: "Lên kế hoạch chi tiết và tuân thủ nghiêm ngặt", icon: "fa-list-ol", value: "C" }
        ]
    },
    {
        id: 18,
        text: "Khi giao việc cho người khác, tôi:",
        options: [
            { text: "Giao kết quả mong muốn và tự do thực hiện", icon: "fa-paper-plane", value: "D" },
            { text: "Giải thích tầm quan trọng và truyền cảm hứng", icon: "fa-microphone", value: "I" },
            { text: "Hướng dẫn chi tiết và hỗ trợ liên tục", icon: "fa-chalkboard-teacher", value: "S" },
            { text: "Cung cấp quy trình rõ ràng và tiêu chuẩn", icon: "fa-clipboard-check", value: "C" }
        ]
    },
    {
        id: 19,
        text: "Phản ứng của tôi với sự không chắc chắn là:",
        options: [
            { text: "Hành động quyết đoán để giảm thiểu rủi ro", icon: "fa-shield-virus", value: "D" },
            { text: "Tìm kiếm thông tin và ý kiến đa dạng", icon: "fa-globe", value: "I" },
            { text: "Duy trì sự bình tĩnh và kiên nhẫn", icon: "fa-om", value: "S" },
            { text: "Nghiên cứu kỹ lưỡng trước khi hành động", icon: "fa-search-dollar", value: "C" }
        ]
    },
    {
        id: 20,
        text: "Khi giải quyết vấn đề, tôi:",
        options: [
            { text: "Tập trung vào giải pháp nhanh và hiệu quả", icon: "fa-puzzle-piece", value: "D" },
            { text: "Brainstorm ý tưởng sáng tạo", icon: "fa-lightbulb", value: "I" },
            { text: "Cân nhắc tác động đến mọi người", icon: "fa-user-friends", value: "S" },
            { text: "Phân tích nguyên nhân và yếu tố liên quan", icon: "fa-project-diagram", value: "C" }
        ]
    },
    {
        id: 21,
        text: "Khi thuyết trình, tôi:",
        options: [
            { text: "Đi thẳng vào vấn đề và tập trung kết quả", icon: "fa-bullhorn", value: "D" },
            { text: "Sử dụng storytelling và tương tác", icon: "fa-theater-masks", value: "I" },
            { text: "Chuẩn bị kỹ lưỡng và trình bày có cấu trúc", icon: "fa-desktop", value: "S" },
            { text: "Cung cấp dữ liệu chi tiết và chính xác", icon: "fa-chart-pie", value: "C" }
        ]
    },
    {
        id: 22,
        text: "Khi làm việc độc lập, tôi:",
        options: [
            { text: "Thrive với tự do và trách nhiệm", icon: "fa-fighter-jet", value: "D" },
            { text: "Thường tìm kiếm tương tác và phản hồi", icon: "fa-comments", value: "I" },
            { text: "Thích có hướng dẫn rõ ràng", icon: "fa-map-signs", value: "S" },
            { text: "Phân tích và lập kế hoạch chi tiết", icon: "fa-sitemap", value: "C" }
        ]
    },
    {
        id: 23,
        text: "Khi đối mặt với ý kiến trái chiều, tôi:",
        options: [
            { text: "Thảo luận logic và bảo vệ quan điểm", icon: "fa-comments-alt", value: "D" },
            { text: "Lắng nghe và tìm kiếm sự thấu hiểu", icon: "fa-ear", value: "I" },
            { text: "Tránh đối đầu và tìm giải pháp hòa bình", icon: "fa-dove", value: "S" },
            { text: "Yêu cầu bằng chứng và phân tích", icon: "fa-balance-scale-right", value: "C" }
        ]
    },
    {
        id: 24,
        text: "Mục tiêu lâu dài của tôi là:",
        options: [
            { text: "Đạt được vị trí lãnh đạo và ảnh hưởng", icon: "fa-mountain", value: "D" },
            { text: "Xây dựng mạng lưới quan hệ rộng lớn", icon: "fa-network-wired", value: "I" },
            { text: "Tạo sự ổn định và hài lòng", icon: "fa-anchor", value: "S" },
            { text: "Trở thành chuyên gia trong lĩnh vực", icon: "fa-user-graduate", value: "C" }
        ]
    }
];

let currentQuestion = 0;
let answers = new Array(questions.length).fill(null);
let flaggedQuestions = new Set();
let viewMode = 'single';
let assessmentStarted = false;

function startAssessment() {
    document.getElementById('introSection').style.display = 'none';
    document.getElementById('questionContainer').classList.add('active');
    assessmentStarted = true;
    currentQuestion = 0;
    initializeGrid();
    updateGrid();
    showQuestion(0);
    updateProgress();
}

function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.view-btn').classList.add('active');

    if (mode === 'single') {
        document.getElementById('questionContainer').classList.add('active');
        document.getElementById('gridContainer').classList.remove('active');
    } else {
        document.getElementById('questionContainer').classList.remove('active');
        document.getElementById('gridContainer').classList.add('active');
    }
}

function initializeGrid() {
    const gridContainer = document.getElementById('questionsGrid');
    gridContainer.innerHTML = '';

    questions.forEach((question, index) => {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-question-card';
        gridItem.id = `grid_question_${index}`;

        gridItem.innerHTML = `
            <div class="grid-question-header">
                <div class="grid-question-number">${index + 1}</div>
                <button class="flag-btn ${flaggedQuestions.has(index) ? 'flagged' : ''}"
                        onclick="toggleGridFlag(${index})" id="grid_flag_${index}">
                    <i class="fas fa-flag"></i>
                </button>
            </div>
            <div class="grid-question-text">${question.text}</div>
            <div class="grid-options-container">
                ${question.options.map((option, optionIndex) => `
                    <div class="grid-option">
                        <input type="radio" id="grid_option_${index}_${optionIndex}"
                               name="grid_option_${index}" value="${optionIndex}"
                               ${answers[index] === optionIndex ? 'checked' : ''}>
                        <label for="grid_option_${index}_${optionIndex}">
                            <i class="fas ${option.icon}" style="margin-right: 0.5rem;"></i>
                            <span>${option.text}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;

        gridContainer.appendChild(gridItem);

        // Add event listeners for grid options
        gridItem.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', function() {
                updateAnswer(index, parseInt(this.value));
                updateGridItemStatus(index);
            });
        });

        updateGridItemStatus(index);
    });
}

function updateGridItemStatus(index) {
    const gridItem = document.getElementById(`grid_question_${index}`);
    if (answers[index] !== null) {
        gridItem.classList.add('answered');
    } else {
        gridItem.classList.remove('answered');
    }

    if (flaggedQuestions.has(index)) {
        gridItem.classList.add('flagged');
    } else {
        gridItem.classList.remove('flagged');
    }
}

function showQuestion(index) {
    const question = questions[index];
    document.getElementById('questionNumber').textContent = index + 1;
    document.getElementById('questionText').textContent = question.text;

    // Generate options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, optionIndex) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';

        optionDiv.innerHTML = `
            <input type="radio" id="option_${optionIndex}" name="disc_option" value="${optionIndex}">
            <label for="option_${optionIndex}">
                <i class="fas ${option.icon} option-icon"></i>
                <span class="option-text">${option.text}</span>
            </label>
        `;

        optionsContainer.appendChild(optionDiv);
    });

    // Add event listeners
    optionsContainer.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateAnswer(currentQuestion, parseInt(this.value));
        });
    });

    // Set previous answer if exists
    if (answers[index] !== null) {
        const radio = document.querySelector(`input[name="disc_option"][value="${answers[index]}"]`);
        if (radio) radio.checked = true;
    }

    // Update flag button
    const flagBtn = document.getElementById('flagBtn');
    if (flaggedQuestions.has(index)) {
        flagBtn.classList.add('flagged');
        flagBtn.innerHTML = '<i class="fas fa-flag"></i> Bỏ đánh dấu';
    } else {
        flagBtn.classList.remove('flagged');
        flagBtn.innerHTML = '<i class="fas fa-flag"></i> Đánh dấu';
    }

    updateGrid();
    updateNavigationButtons();
}

function updateGrid() {
    const gridContainer = document.getElementById('questionGrid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    questions.forEach((question, index) => {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        if (index === currentQuestion) gridItem.classList.add('current');
        if (answers[index] !== null) gridItem.classList.add('answered');
        if (flaggedQuestions.has(index)) gridItem.classList.add('flagged');

        gridItem.textContent = index + 1;
        gridItem.onclick = () => {
            currentQuestion = index;
            showQuestion(index);
            setViewMode('single');
        };

        gridContainer.appendChild(gridItem);
    });
}

function updateAnswer(questionIndex, value) {
    // If value is an index, convert to DISC value
    if (typeof value === 'number') {
        const option = questions[questionIndex].options[value];
        answers[questionIndex] = option.value || 'C'; // Default to C
    } else {
        answers[questionIndex] = value;
    }
    updateProgress();
    updateSubmitButton();
}

function calculateDISCType() {
    const scores = { D: 0, I: 0, S: 0, C: 0 };
    answers.forEach(answer => {
        if (answer && scores.hasOwnProperty(answer)) {
            scores[answer]++;
        }
    });

    // Find primary trait
    let primaryTrait = 'C';
    let maxScore = 0;
    for (const [key, value] of Object.entries(scores)) {
        if (value > maxScore) {
            maxScore = value;
            primaryTrait = key;
        }
    }

    // Calculate total valid answers
    const totalValidAnswers = Object.values(scores).reduce((sum, score) => sum + score, 0);

    // Calculate percentages with proper rounding to ensure total = 100
    const percentages = {};
    let remainingPercentage = 100;
    const traits = ['D', 'I', 'S', 'C'];

    traits.forEach((trait, index) => {
        if (index === traits.length - 1) {
            // Last trait gets remaining percentage
            percentages[trait] = remainingPercentage;
        } else {
            percentages[trait] = Math.round((scores[trait] / totalValidAnswers) * 100);
            remainingPercentage -= percentages[trait];
        }
    });

    return {
        type: primaryTrait,
        scores: scores,
        percentages: percentages
    };
}

function toggleFlag() {
    const index = currentQuestion;
    if (flaggedQuestions.has(index)) {
        flaggedQuestions.delete(index);
    } else {
        flaggedQuestions.add(index);
    }
    showQuestion(index);
}

function toggleGridFlag(index) {
    if (flaggedQuestions.has(index)) {
        flaggedQuestions.delete(index);
    } else {
        flaggedQuestions.add(index);
    }
    updateGridItemStatus(index);
    updateGrid();
    updateProgress();
}

function updateProgress() {
    const answered = answers.filter(answer => answer !== null).length;
    const progress = Math.round((answered / questions.length) * 100);

    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (progress / 100) * circumference;

    const progressRing = document.getElementById('progressRing');
    if (progressRing) {
        progressRing.style.strokeDasharray = `${circumference - offset} ${circumference}`;
    }

    const progressPercent = document.getElementById('progressPercent');
    if (progressPercent) {
        progressPercent.textContent = `${progress}%`;
    }

    const answeredCount = document.getElementById('answeredCount');
    if (answeredCount) {
        answeredCount.textContent = answered;
    }

    const flaggedCount = document.getElementById('flaggedCount');
    if (flaggedCount) {
        flaggedCount.textContent = flaggedQuestions.size;
    }
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    const allAnswered = answers.every(answer => answer !== null);
    submitBtn.disabled = !allAnswered || !assessmentStarted;
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentQuestion === 0;

    if (currentQuestion === questions.length - 1) {
        nextBtn.innerHTML = 'Hoàn thành <i class="fas fa-check"></i>';
        nextBtn.onclick = submitAssessment;
    } else {
        nextBtn.innerHTML = 'Câu tiếp theo <i class="fas fa-arrow-right"></i>';
        nextBtn.onclick = nextQuestion;
    }
}

function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        showQuestion(currentQuestion);
    }
}

function previousQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        showQuestion(currentQuestion);
    }
}

function showFlaggedQuestions() {
    if (flaggedQuestions.size === 0) {
        alert('Bạn chưa đánh dấu câu hỏi nào.');
        return;
    }

    let flaggedMessage = 'Các câu hỏi đã đánh dấu:\n\n';
    flaggedQuestions.forEach(index => {
        flaggedMessage += `Câu ${index + 1}: ${questions[index].text}\n`;
    });

    alert(flaggedMessage);
}

function submitAssessment() {
    const allAnswered = answers.every(answer => answer !== null);

    if (!allAnswered) {
        const unanswered = answers.map((answer, index) => answer === null ? index + 1 : null)
                                  .filter(index => index !== null);
        alert(`Vui lòng trả lời tất cả các câu hỏi. Còn ${unanswered.length} câu chưa trả lời: ${unanswered.join(', ')}`);
        return;
    }

    if (flaggedQuestions.size > 0) {
        const confirmSubmit = confirm(`Bạn có ${flaggedQuestions.size} câu hỏi đã đánh dấu. Bạn có chắc muốn hoàn thành bài kiểm tra không?`);
        if (!confirmSubmit) return;
    }

    document.getElementById('questionContainer').style.display = 'none';
    document.getElementById('gridContainer').classList.remove('active');
    document.getElementById('loadingSection').classList.add('active');

    // Calculate DISC type
    const discResult = calculateDISCType();

    fetch('/personality-assessments/disc/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            answers: answers,
            discType: discResult.type,
            scores: discResult.scores,
            percentages: discResult.percentages
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirectTo;
        } else {
            alert('Có lỗi xảy ra. Vui lòng thử lại.');
            document.getElementById('loadingSection').classList.remove('active');
            document.getElementById('questionContainer').style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Có lỗi xảy ra. Vui lòng thử lại.');
        document.getElementById('loadingSection').classList.remove('active');
        document.getElementById('questionContainer').style.display = 'block';
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (!assessmentStarted || document.getElementById('questionContainer').style.display === 'none') return;

    if (e.key >= '1' && e.key <= '4') {
        const radio = document.querySelector(`input[name="disc_option"][value="${parseInt(e.key) - 1}"]`);
        if (radio) {
            radio.checked = true;
            updateAnswer(currentQuestion, parseInt(e.key) - 1);
        }
    } else if (e.key === 'ArrowRight' && currentQuestion < questions.length - 1) {
        nextQuestion();
    } else if (e.key === 'ArrowLeft' && currentQuestion > 0) {
        previousQuestion();
    } else if (e.key === 'Enter' && answers.every(answer => answer !== null)) {
        submitAssessment();
    } else if (e.key === 'f' || e.key === 'F') {
        toggleFlag();
    }
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    if (window.innerWidth <= 1024 &&
        !sidebar.contains(e.target) &&
        !menuBtn.contains(e.target) &&
        sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
});
