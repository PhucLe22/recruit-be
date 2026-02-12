const questions = [
    {
        id: 1,
        text: "Bạn thích dành thời gian ở:",
        options: [
            { text: "Một mình hoặc với nhóm nhỏ bạn thân", icon: "fa-user", value: "I" },
            { text: "Cùng nhiều người và tham gia các hoạt động xã hội", icon: "fa-users", value: "E" }
        ]
    },
    {
        id: 2,
        text: "Bạn thường tập trung vào:",
        options: [
            { text: "Thông tin cụ thể, thực tế và chi tiết", icon: "fa-search", value: "S" },
            { text: "Các khả năng, ý tưởng và bức tranh tổng thể", icon: "fa-lightbulb", value: "N" }
        ]
    },
    {
        id: 3,
        text: "Khi ra quyết định, bạn dựa vào:",
        options: [
            { text: "Lý trí, logic và các nguyên tắc khách quan", icon: "fa-brain", value: "T" },
            { text: "Cảm xúc, giá trị và ảnh hưởng đến người khác", icon: "fa-heart", value: "F" }
        ]
    },
    {
        id: 4,
        text: "Bạn thích sống một cách:",
        options: [
            { text: "Có kế hoạch, có tổ chức và có quyết định", icon: "fa-calendar-check", value: "J" },
            { text: "Linh hoạt, tự nhiên và để mở các lựa chọn", icon: "fa-random", value: "P" }
        ]
    },
    {
        id: 5,
        text: "Bạn cảm thấy thoải mái hơn khi:",
        options: [
            { text: "Nghĩ kỹ rồi mới nói", icon: "fa-comment-dots", value: "I" },
            { text: "Nói và suy nghĩ đồng thời", icon: "fa-comments", value: "E" }
        ]
    },
    {
        id: 6,
        text: "Bạn tin tưởng hơn vào:",
        options: [
            { text: "Kinh nghiệm trong quá khứ", icon: "fa-history", value: "S" },
            { text: "Trực giác và cảm hứng", icon: "fa-magic", value: "N" }
        ]
    },
    {
        id: 7,
        text: "Bạn đánh giá cao hơn:",
        options: [
            { text: "Sự công bằng và thống nhất", icon: "fa-balance-scale", value: "T" },
            { text: "Sự đồng cảm và thấu hiểu", icon: "fa-hand-holding-heart", value: "F" }
        ]
    },
    {
        id: 8,
        text: "Bạn thích làm việc:",
        options: [
            { text: "Theo lịch trình và hoàn thành đúng hạn", icon: "fa-clock", value: "J" },
            { text: "Linh hoạt và thích nghi với thay đổi", icon: "fa-sync-alt", value: "P" }
        ]
    },
    {
        id: 9,
        text: "Bạn được mô tả là người:",
        options: [
            { text: "Rất riêng tư và kín đáo", icon: "fa-lock", value: "I" },
            { text: "Hướng ngoại và cởi mở", icon: "fa-door-open", value: "E" }
        ]
    },
    {
        id: 10,
        text: "Bạn thích:",
        options: [
            { text: "Sự rõ ràng và cụ thể", icon: "fa-bullseye", value: "S" },
            { text: "Sự trừu tượng và sáng tạo", icon: "fa-palette", value: "N" }
        ]
    },
    {
        id: 11,
        text: "Khi gặp vấn đề, bạn:",
        options: [
            { text: "Phân tích logic để tìm giải pháp", icon: "fa-cogs", value: "T" },
            { text: "Xem xét cảm xúc của những người liên quan", icon: "fa-people-arrows", value: "F" }
        ]
    },
    {
        id: 12,
        text: "Bạn thích kế hoạch:",
        options: [
            { text: "Chi tiết và rõ ràng trước khi bắt đầu", icon: "fa-list-ol", value: "J" },
            { text: "Linh hoạt và điều chỉnh khi cần", icon: "fa-sliders-h", value: "P" }
        ]
    },
    {
        id: 13,
        text: "Trong một cuộc họp, bạn:",
        options: [
            { text: "Lắng nghe nhiều hơn nói", icon: "fa-headphones", value: "I" },
            { text: "Tham gia tích cực vào cuộc thảo luận", icon: "fa-microphone", value: "E" }
        ]
    },
    {
        id: 14,
        text: "Bạn học tập tốt nhất thông qua:",
        options: [
            { text: "Ví dụ cụ thể và thực hành", icon: "fa-flask", value: "S" },
            { text: "Lý thuyết và khái niệm chung", icon: "fa-book", value: "N" }
        ]
    },
    {
        id: 15,
        text: "Khi xung đột, bạn:",
        options: [
            { text: "Tập trung vào sự công bằng", icon: "fa-gavel", value: "T" },
            { text: "Quan tâm đến cảm xúc của mọi người", icon: "fa-smile", value: "F" }
        ]
    },
    {
        id: 16,
        text: "Bạn thích công việc:",
        options: [
            { text: "Có deadline rõ ràng", icon: "fa-hourglass-half", value: "J" },
            { text: "Có sự linh hoạt về thời gian", icon: "fa-infinity", value: "P" }
        ]
    },
    {
        id: 17,
        text: "Bạn cảm thấy năng lượng từ:",
        options: [
            { text: "Thời gian một mình", icon: "fa-moon", value: "I" },
            { text: "Tương tác xã hội", icon: "fa-sun", value: "E" }
        ]
    },
    {
        id: 18,
        text: "Bạn tin vào:",
        options: [
            { text: "Những gì bạn có thể nhìn thấy và chứng minh", icon: "fa-eye", value: "S" },
            { text: "Khả năng và tiềm năng ẩn", icon: "fa-star", value: "N" }
        ]
    },
    {
        id: 19,
        text: "Bạn đưa ra quyết định dựa trên:",
        options: [
            { text: "Nguyên tắc và logic", icon: "fa-chess", value: "T" },
            { text: "Giá trị cá nhân", icon: "fa-gem", value: "F" }
        ]
    },
    {
        id: 20,
        text: "Bạn thích:",
        options: [
            { text: "Hoàn thành công việc trước deadline", icon: "fa-check-double", value: "J" },
            { text: "Làm việc dưới áp lực thời gian", icon: "fa-bolt", value: "P" }
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
            <input type="radio" id="option_${optionIndex}" name="mbti_option" value="${optionIndex}">
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
        const radio = document.querySelector(`input[name="mbti_option"][value="${answers[index]}"]`);
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
    // Store the option index, but also track the MBTI value
    if (typeof value === 'number') {
        answers[questionIndex] = value;
    }
    updateProgress();
    updateSubmitButton();
}

function calculateMBTIType() {
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

    answers.forEach((answer, index) => {
        if (answer !== null && questions[index]) {
            const option = questions[index].options[answer];
            if (option && option.value) {
                scores[option.value]++;
            }
        }
    });

    // Determine type based on highest scores in each dimension
    const type =
        (scores.E >= scores.I ? 'E' : 'I') +
        (scores.N >= scores.S ? 'N' : 'S') +
        (scores.T >= scores.F ? 'T' : 'F') +
        (scores.J >= scores.P ? 'J' : 'P');

    return {
        type: type,
        scores: scores
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

    // Calculate MBTI type
    const mbtiResult = calculateMBTIType();

    // Convert answers from option indices to MBTI values for server
    const mbtiAnswers = answers.map((answer, index) => {
        if (answer !== null && questions[index]) {
            return questions[index].options[answer].value;
        }
        return null;
    });

    fetch('/personality-assessments/mbti/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            answers: mbtiAnswers,
            mbtiType: mbtiResult.type,
            scores: mbtiResult.scores
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

    if (e.key >= '1' && e.key <= '2') {
        const radio = document.querySelector(`input[name="mbti_option"][value="${parseInt(e.key) - 1}"]`);
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
