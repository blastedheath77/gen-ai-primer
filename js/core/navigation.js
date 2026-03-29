/**
 * navigation.js
 * Handles page header badge, progress dots, keyboard navigation,
 * visited-page tracking (localStorage), and settings modal toggle.
 */

const TOTAL_PAGES = 18;
const STORAGE_KEY = 'ai-primer-visited';

/** Phase boundaries (inclusive, 1-indexed page numbers) */
const PHASE_MAP = [
    { phase: 1, start: 1,  end: 4  },
    { phase: 2, start: 5,  end: 9  },
    { phase: 3, start: 10, end: 14 },
    { phase: 4, start: 15, end: 18 },
];

/**
 * Returns the phase number (1-4) for a given page number.
 * @param {number} page
 * @returns {number}
 */
function phaseFor(page) {
    for (const { phase, start, end } of PHASE_MAP) {
        if (page >= start && page <= end) return phase;
    }
    return 1;
}

/**
 * Formats a page number as a zero-padded two-digit string.
 * @param {number} n
 * @returns {string}
 */
function padPage(n) {
    return String(n).padStart(2, '0');
}

/**
 * Resolves the relative URL to a given page from the current location.
 * Pages live at  …/pages/page-XX.html.
 * The function figures out whether we are already in /pages/ or one level up.
 * @param {number} pageNum
 * @returns {string}
 */
function pageUrl(pageNum) {
    const filename = `page-${padPage(pageNum)}.html`;
    const path = window.location.pathname;
    // If we are inside /pages/ directory navigate to a sibling
    if (path.includes('/pages/')) {
        return filename;
    }
    // Otherwise (index, root) navigate into pages/
    return `pages/${filename}`;
}

/**
 * Loads the visited-pages set from localStorage.
 * @returns {Set<number>}
 */
function loadVisited() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return new Set(JSON.parse(raw));
    } catch (_) { /* ignore */ }
    return new Set();
}

/**
 * Persists the visited-pages set to localStorage.
 * @param {Set<number>} visited
 */
function saveVisited(visited) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
    } catch (_) { /* ignore */ }
}

/**
 * Returns the current page number read from <body data-page="N">.
 * Returns 0 if the attribute is absent or invalid.
 * @returns {number}
 */
function currentPageNumber() {
    const raw = document.body.getAttribute('data-page');
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 && n <= TOTAL_PAGES ? n : 0;
}

/**
 * Navigates to the target page number if it is within bounds.
 * @param {number} target
 */
function goToPage(target) {
    if (target < 1 || target > TOTAL_PAGES) return;
    window.location.href = pageUrl(target);
}

/**
 * Builds and inserts the progress-dot elements inside .progress-dots.
 * @param {number} currentPage
 * @param {Set<number>} visited
 */
function buildProgressDots(currentPage, visited) {
    const container = document.querySelector('#progress-dots') || document.querySelector('.progress-dots');
    if (!container) return;
    container.classList.add('progress-dots');

    container.innerHTML = '';

    PHASE_MAP.forEach(({ phase, start, end }, i) => {
        // Add separator between phases (not before the first)
        if (i > 0) {
            const sep = document.createElement('span');
            sep.className = 'progress-dot-sep';
            sep.setAttribute('aria-hidden', 'true');
            container.appendChild(sep);
        }

        for (let page = start; page <= end; page++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `progress-dot phase-${phase}`;
            dot.setAttribute('aria-label', `Page ${page}`);
            dot.dataset.page = String(page);

            if (page === currentPage) {
                dot.classList.add('current');
                dot.setAttribute('aria-current', 'page');
            } else if (visited.has(page)) {
                dot.classList.add('visited');
            }

            dot.addEventListener('click', () => {
                if (page !== currentPage) goToPage(page);
            });

            container.appendChild(dot);
        }
    });
}

/**
 * Wires up keyboard arrow navigation.
 * @param {number} currentPage
 */
function bindKeyboardNavigation(currentPage) {
    document.addEventListener('keydown', (e) => {
        // Ignore when typing in an input / textarea
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            goToPage(currentPage + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            goToPage(currentPage - 1);
        }
    });
}

/**
 * Wires up the settings gear button to open/close the settings modal.
 */
function bindSettingsToggle() {
    const toggleBtn = document.querySelector('.settings-toggle');
    const modal = document.querySelector('.settings-modal');
    if (!toggleBtn || !modal) return;

    toggleBtn.addEventListener('click', () => {
        const isOpen = modal.classList.contains('open');
        if (isOpen) {
            modal.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        } else {
            modal.classList.add('open');
            toggleBtn.setAttribute('aria-expanded', 'true');
        }
    });

    // Close when clicking the backdrop (outside the panel)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            modal.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Also wire the close button inside the modal if present
    const closeBtn = modal.querySelector('.settings-modal__close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('open');
            toggleBtn.setAttribute('aria-expanded', 'false');
        });
    }
}

/**
 * Sets the data-phase attribute on <body> (and <html>) so that
 * phase-specific CSS selectors work automatically.
 * @param {number} phase
 */
function setPhaseAttribute(phase) {
    document.documentElement.setAttribute('data-phase', String(phase));
    document.body.setAttribute('data-phase', String(phase));
}

/**
 * Updates prev/next nav links if they exist in the DOM.
 * @param {number} currentPage
 */
function updateNavLinks(currentPage) {
    const prevLink = document.querySelector('.nav-prev');
    const nextLink = document.querySelector('.nav-next');

    if (prevLink) {
        if (currentPage <= 1) {
            prevLink.classList.add('disabled');
            prevLink.removeAttribute('href');
        } else {
            prevLink.classList.remove('disabled');
            prevLink.setAttribute('href', pageUrl(currentPage - 1));
        }
    }

    if (nextLink) {
        if (currentPage >= TOTAL_PAGES) {
            nextLink.classList.add('disabled');
            nextLink.removeAttribute('href');
        } else {
            nextLink.classList.remove('disabled');
            nextLink.setAttribute('href', pageUrl(currentPage + 1));
        }
    }
}

/**
 * Main initialisation function.
 * Call once per page after the DOM is ready.
 */
export function initNavigation() {
    const currentPage = currentPageNumber();
    const visited = loadVisited();

    // Mark current page as visited
    if (currentPage > 0) {
        visited.add(currentPage);
        saveVisited(visited);
    }

    // Apply phase attribute for CSS
    if (currentPage > 0) {
        setPhaseAttribute(phaseFor(currentPage));
    }

    // Build progress dots
    buildProgressDots(currentPage, visited);

    // Wire keyboard navigation
    if (currentPage > 0) {
        bindKeyboardNavigation(currentPage);
    }

    // Wire settings toggle
    bindSettingsToggle();

    // Update prev/next nav links
    if (currentPage > 0) {
        updateNavLinks(currentPage);
    }
}

// Auto-initialise when the module is imported in a page context
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }
}
