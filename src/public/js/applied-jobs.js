document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.applied-card');
    const filters = document.querySelectorAll('.applied-filter');
    const emptyFilter = document.getElementById('emptyFilter');
    const jobsList = document.getElementById('appliedJobsList');

    // Count statuses for stats
    let counts = { total: cards.length, pending: 0, approved: 0, rejected: 0, scheduled: 0 };
    cards.forEach(card => {
        const status = card.dataset.status;
        if (counts[status] !== undefined) counts[status]++;
    });

    // Update stat numbers
    const totalEl = document.getElementById('totalCount');
    const pendingEl = document.getElementById('pendingCount');
    const approvedEl = document.getElementById('approvedCount');
    const rejectedEl = document.getElementById('rejectedCount');
    if (totalEl) totalEl.textContent = counts.total;
    if (pendingEl) pendingEl.textContent = counts.pending;
    if (approvedEl) approvedEl.textContent = counts.approved;
    if (rejectedEl) rejectedEl.textContent = counts.rejected;

    // Filter functionality
    filters.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;

            filters.forEach(f => f.classList.remove('active'));
            this.classList.add('active');

            let visibleCount = 0;
            cards.forEach(card => {
                if (filter === 'all' || card.dataset.status === filter) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (emptyFilter && jobsList) {
                if (visibleCount === 0) {
                    emptyFilter.style.display = '';
                    jobsList.style.display = 'none';
                } else {
                    emptyFilter.style.display = 'none';
                    jobsList.style.display = '';
                }
            }
        });
    });
});
