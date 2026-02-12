const questions = [
    { id: 1, text: "Tôi có trí tưởng tượng phong phú" },
    { id: 2, text: "Tôi luôn chuẩn bị mọi thứ một cách cẩn thận" },
    { id: 3, text: "Tôi nói chuyện với nhiều người khác nhau tại các buổi tiệc" },
    { id: 4, text: "Tôi cảm thấy đồng cảm với cảm xúc của người khác" },
    { id: 5, text: "Tôi thường xuyên cảm thấy lo lắng" },
    { id: 6, text: "Tôi thích có nhiều sở thích khác nhau" },
    { id: 7, text: "Tôi luôn hoàn thành công việc đúng hạn" },
    { id: 8, text: "Tôi là trung tâm của sự chú ý tại các buổi tiệc" },
    { id: 9, text: "Tôi không quan tâm đến cảm xúc của người khác" },
    { id: 10, text: "Tôi thư giãn một cách dễ dàng" },
    { id: 11, text: "Tôi tò mò về nhiều điều khác nhau" },
    { id: 12, text: "Tôi để mọi thứ lộn xộn" },
    { id: 13, text: "Tôi không thích nói chuyện" },
    { id: 14, text: "Tôi làm người khác cảm thấy thoải mái" },
    { id: 15, text: "Tôi dễ dàng bị căng thẳng" },
    { id: 16, text: "Tôi có trí tưởng tượng sống động" },
    { id: 17, text: "Tôi luôn đáng tin cậy" },
    { id: 18, text: "Tôi tràn đầy năng lượng" },
    { id: 19, text: "Tôi ít quan tâm đến người khác" },
    { id: 20, text: "Tôi thường xuyên lo lắng" },
    { id: 21, text: "Tôi thích thử những trải nghiệm mới" },
    { id: 22, text: "Tôi làm việc một cách có phương pháp" },
    { id: 23, text: "Tôi bắt đầu các cuộc trò chuyện" },
    { id: 24, text: "Tôi cảm thấy quan tâm đến người khác" },
    { id: 25, text: "Tôi dễ bị cáu kỉnh" }
];

let currentQuestion = 0;
let answers = new Array(questions.length).fill(null);
let flaggedQuestions = new Set();
let viewMode = 'single';
let assessmentStarted = false;

function initializeScale() {
    const scaleOptions = document.getElementById('scaleOptions');
    const scaleLabels = ['Hoàn toàn không đồng ý', 'Không đồng ý', 'Bình thường', 'Đồng ý', 'Hoàn toàn đồng ý'];

    scaleOptions.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'scale-option';

        optionDiv.innerHTML = `
            <input type="radio" id="scale_${i}" name="scale" value="${i}">
            <label for="scale_${i}">
                <span class="scale-number">${i}</span>
                <span class="scale-text">${scaleLabels[i-1]}</span>
            </label>
        `;

        scaleOptions.appendChild(optionDiv);
    }

    scaleOptions.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateAnswer(currentQuestion, parseInt(this.value));
        });
    });
}

function startAssessment() {
    document.getElementById('introSection').style.display = 'none';
    document.getElementById('questionContainer').classList.add('active');
    assessmentStarted = true;
    currentQuestion = 0;
    initializeScale();
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
            <div class="grid-scale-options">
                ${[1, 2, 3, 4, 5].map(value => `
                    <div class="grid-scale-option">
                        <input type="radio" id="grid_scale_${index}_${value}"
                               name="grid_scale_${index}" value="${value}"
                               ${answers[index] === value ? 'checked' : ''}>
                        <label for="grid_scale_${index}_${value}">
                            <span>${value}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;

        gridContainer.appendChild(gridItem);

        // Add event listeners for grid scale options
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

    // Clear previous selection
    document.querySelectorAll('input[name="scale"]').forEach(radio => {
        radio.checked = false;
    });

    // Set previous answer if exists
    if (answers[index] !== null) {
        const radio = document.querySelector(`input[name="scale"][value="${answers[index]}"]`);
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
    answers[questionIndex] = value;
    updateProgress();
    updateSubmitButton();
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

    fetch('/personality-assessments/big-five/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers: answers })
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

    if (e.key >= '1' && e.key <= '5') {
        const radio = document.querySelector(`input[name="scale"][value="${e.key}"]`);
        if (radio) {
            radio.checked = true;
            updateAnswer(currentQuestion, parseInt(e.key));
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
