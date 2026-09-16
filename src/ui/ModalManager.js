export class ModalManager {
  constructor(lenis) {
    this.lenis = lenis;

    // Modals
    this.registerModal = document.getElementById('register-modal');
    this.fanModal = document.getElementById('fan-modal');
    this.partnerModal = document.getElementById('partner-modal');
    this.exploreModal = document.getElementById('explore-modal');

    // Forms
    this.regForm = document.getElementById('registration-form');
    this.successMsg = document.getElementById('form-success-msg');

    this.initEventListeners();
  }

  initEventListeners() {
    // 1. Open Register Modal (For Bands)
    document.querySelectorAll('#nav-register-btn, #main-register-btn, .open-band-modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal(this.registerModal);
      });
    });

    // Close Register Modal
    const regClose = document.getElementById('modal-close');
    if (regClose) regClose.addEventListener('click', () => this.closeModal(this.registerModal));

    // 2. Open Fan / Audience Modal
    document.querySelectorAll('.open-fan-modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal(this.fanModal);
      });
    });

    const fanClose = document.getElementById('fan-close');
    if (fanClose) fanClose.addEventListener('click', () => this.closeModal(this.fanModal));

    // 3. Open Partner / Brand Modal
    document.querySelectorAll('.open-partner-modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal(this.partnerModal);
      });
    });

    const partnerClose = document.getElementById('partner-close');
    if (partnerClose) partnerClose.addEventListener('click', () => this.closeModal(this.partnerModal));

    // Close Explore Modal if open
    const exploreClose = document.getElementById('explore-close');
    if (exploreClose) exploreClose.addEventListener('click', () => this.closeModal(this.exploreModal));

    // Close on backdrop click
    [this.registerModal, this.fanModal, this.partnerModal, this.exploreModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) this.closeModal(modal);
        });
      }
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal(this.registerModal);
        this.closeModal(this.fanModal);
        this.closeModal(this.partnerModal);
        this.closeModal(this.exploreModal);
      }
    });

    // Form submission for Band Registration
    if (this.regForm) {
      this.regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (this.successMsg) {
          this.successMsg.style.display = 'block';
          this.regForm.reset();
          setTimeout(() => {
            this.closeModal(this.registerModal);
            this.successMsg.style.display = 'none';
          }, 3500);
        }
      });
    }

  }

  openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}
