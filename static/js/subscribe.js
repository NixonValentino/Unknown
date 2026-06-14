/**
 * Subscribe Module - Subscription Feature
 * Handles plan selection, confirmation modal, and payment processing
 */

/* ════════════════════════════════════════════
   THEME TOGGLE
════════════════════════════════════════════ */

(function() {
    // Get current theme from localStorage or default to 'light'
    let currentTheme = localStorage.getItem('mb-theme') || 'light';
    
    // Apply theme on page load
    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mb-theme', theme);
        
        // Update icon
        const themeBtn = document.getElementById('themeBtnSubscribe');
        const themeIcon = document.getElementById('themeIconSubscribe');
        if (themeIcon && theme === 'dark') {
            // Change to moon icon for dark mode
            themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
        } else if (themeIcon) {
            // Change to sun icon for light mode
            themeIcon.innerHTML = '<circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />';
        }
    }
    
    // Apply initial theme
    applyTheme(currentTheme);
    
    // Theme toggle button handler
    const themeBtnSubscribe = document.getElementById('themeBtnSubscribe');
    if (themeBtnSubscribe) {
        themeBtnSubscribe.addEventListener('click', function() {
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        });
    }
})();

class SubscriptionManager {
    constructor() {
        // DOM Elements
        this.planButtons = document.querySelectorAll('.plan-btn');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.successOverlay = document.getElementById('successOverlay');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalDesc = document.getElementById('modalDesc');
        this.modalConfirm = document.getElementById('modalConfirm');
        this.modalCancel = document.getElementById('modalCancel');
        this.successMsg = document.getElementById('successMsg');
        this.successBtn = document.getElementById('successBtn');
        
        // State
        this.selectedPlan = null;
        this.isProcessing = false;
        this.nextUrl = this.getNextUrl();
        
        // Initialize
        this.init();
    }

    /**
     * Get next URL from Flask template data
     */
    getNextUrl() {
        const pageData = document.getElementById('pageData');
        return pageData?.dataset.next || '/dashboard';
    }

    /**
     * Initialize event listeners
     */
    init() {
        // Plan buttons
        this.planButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handlePlanSelect(e));
        });

        // Modal buttons
        this.modalCancel.addEventListener('click', () => this.closeModal());
        this.modalConfirm.addEventListener('click', () => this.handleSubscribe());
        
        // Success button
        this.successBtn.addEventListener('click', () => this.handleSuccessRedirect());
        
        // Close modal when clicking overlay background
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.closeModal();
            }
        });
    }

    /**
     * Handle plan selection - show confirmation modal
     */
    handlePlanSelect(event) {
        const planId = event.target.dataset.plan;
        const planName = this.getPlanName(planId);
        
        this.selectedPlan = planId;
        
        // Update modal content
        this.modalTitle.textContent = 'Konfirmasi Langganan';
        this.modalDesc.textContent = `Kamu akan berlangganan paket ${planName}`;
        
        // Show modal
        this.showModal();
    }

    /**
     * Get human-readable plan name
     */
    getPlanName(planId) {
        const plans = {
            'monthly': 'Bulanan (Rp 29.000/bulan)',
            'yearly': 'Tahunan (Rp 249.000/tahun)'
        };
        return plans[planId] || planId;
    }

    /**
     * Show confirmation modal
     */
    showModal() {
        this.modalOverlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    /**
     * Close confirmation modal
     */
    closeModal() {
        this.modalOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto'; // Restore scrolling
        this.selectedPlan = null;
    }

    /**
     * Handle subscription confirmation and API call
     */
    async handleSubscribe() {
        if (this.isProcessing || !this.selectedPlan) {
            return;
        }

        this.isProcessing = true;
        this.modalConfirm.disabled = true;
        this.modalConfirm.innerHTML = '<span class="spinner"></span> Memproses...';

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    plan: this.selectedPlan,
                    next: this.nextUrl
                }),
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.handleSubscriptionSuccess(data);
            } else {
                this.handleSubscriptionError(data.message);
            }
        } catch (error) {
            console.error('Subscription error:', error);
            this.handleSubscriptionError('Gagal terhubung ke server. Silakan coba lagi.');
        } finally {
            this.isProcessing = false;
            this.resetConfirmButton();
        }
    }

    /**
     * Handle successful subscription
     */
    handleSubscriptionSuccess(data) {
        // Close confirmation modal
        this.closeModal();

        // Show success message
        const planName = this.getPlanName(this.selectedPlan);
        this.successMsg.innerHTML = `
            <div class="success-message">
                <strong>✓ Langganan ${planName} berhasil!</strong><br>
                Akses aktif hingga <strong>${data.expires}</strong>.<br>
                <small>Membuka halaman pembacaan...</small>
            </div>
        `;

        // Show success overlay
        this.showSuccessOverlay();

        // Redirect after delay
        const redirectTarget = data.redirect || this.nextUrl;
        console.log('Success! Redirecting to:', redirectTarget);
        
        setTimeout(() => {
            window.location.href = redirectTarget;
        }, 2000);
    }

    /**
     * Handle subscription error
     */
    handleSubscriptionError(message) {
        this.closeModal();
        alert(`❌ Gagal mengaktifkan langganan:\n${message}`);
    }

    /**
     * Show success overlay
     */
    showSuccessOverlay() {
        this.successOverlay.classList.remove('hidden');
    }

    /**
     * Hide success overlay
     */
    hideSuccessOverlay() {
        this.successOverlay.classList.add('hidden');
    }

    /**
     * Handle manual success button click
     */
    handleSuccessRedirect() {
        const redirectTarget = this.nextUrl || '/dashboard';
        window.location.href = redirectTarget;
    }

    /**
     * Reset confirm button to initial state
     */
    resetConfirmButton() {
        this.modalConfirm.disabled = false;
        this.modalConfirm.textContent = 'Ya, Aktifkan';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.subscriptionManager = new SubscriptionManager();
    console.log('✓ Subscription Manager initialized');
});
