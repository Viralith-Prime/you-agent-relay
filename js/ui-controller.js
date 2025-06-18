// UI Controller Module - Handles theme, notifications, and UI utilities
export class UIController {
    constructor(appState) {
        this.state = appState;
        this.theme = 'light';
        this.notificationTimeout = null;
    }

    async init() {
        this.initTheme();
        this.setupThemeListener();
        console.log('✅ UI Controller initialized');
    }

    initTheme() {
        this.theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        this.updateThemeIcon();
    }

    setupThemeListener() {
        // Listen for system theme changes
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem('theme')) {
                    this.theme = e.matches ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', this.theme);
                    this.updateThemeIcon();
                }
            });
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        this.updateThemeIcon();
        
        this.showNotification(
            `${this.theme === 'dark' ? '🌙 Dark' : '☀️ Light'} mode activated!`
        );
    }

    updateThemeIcon() {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        }
    }

    showNotification(message, type = 'success', duration = 3000) {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after duration
        clearTimeout(this.notificationTimeout);
        this.notificationTimeout = setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s forwards';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    showGuardianStatus(message, type = 'info') {
        const status = document.getElementById('guardian-status');
        if (!status) return;
        
        status.textContent = message;
        status.className = `guardian-status-overlay active ${type}`;
        
        clearTimeout(this.guardianStatusTimeout);
        this.guardianStatusTimeout = setTimeout(() => {
            status.classList.remove('active');
        }, 3000);
    }

    createModal(options) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="this.parentElement.parentElement.remove()">×</button>
                ${options.title ? `<h3>${options.title}</h3>` : ''}
                ${options.content}
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;
        
        // Add click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Add escape key to close
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        return modal;
    }

    showLoading(element, loading = true) {
        if (loading) {
            element.classList.add('loading');
            element.setAttribute('disabled', 'disabled');
        } else {
            element.classList.remove('loading');
            element.removeAttribute('disabled');
        }
    }

    animateElement(element, animationClass) {
        element.classList.add(animationClass);
        element.addEventListener('animationend', () => {
            element.classList.remove(animationClass);
        }, { once: true });
    }

    addRippleEffect(element, event) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        element.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    setupRippleEffects() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && !button.disabled) {
                this.addRippleEffect(button, e);
            }
        });
    }

    showConfirm(message, onConfirm, onCancel) {
        const modal = this.createModal({
            title: 'Confirm',
            content: `
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        Cancel
                    </button>
                    <button class="btn btn-primary" id="confirm-btn">
                        Confirm
                    </button>
                </div>
            `
        });
        
        document.getElementById('modal-container').appendChild(modal);
        
        const confirmBtn = document.getElementById('confirm-btn');
        confirmBtn.addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.textContent === 'Cancel') {
                if (onCancel) onCancel();
            }
        });
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Expose UI methods to window for onclick handlers
window.UI = {
    toggleTheme: () => window.App.modules.ui.toggleTheme()
};
