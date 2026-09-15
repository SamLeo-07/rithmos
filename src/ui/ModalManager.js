export class ModalManager {
  constructor(lenis) {
    this.lenis = lenis;

    // Elements
    this.registerModal = document.getElementById('register-modal');
    this.exploreModal = document.getElementById('explore-modal');
    this.regForm = document.getElementById('registration-form');
    this.successMsg = document.getElementById('form-success-msg');

    this.initEventListeners();
  }

  initEventListeners() {
    // Open Register Modal
    const regTriggers = [
      document.getElementById('nav-register-btn'),
      document.getElementById('main-register-btn')
    ];
    regTriggers.forEach(btn => {
      if (btn) btn.addEventListener('click', () => this.openModal(this.registerModal));
    });

    // Close Register Modal
    const regClose = document.getElementById('modal-close');
    if (regClose) regClose.addEventListener('click', () => this.closeModal(this.registerModal));

    // Open Explore Modal
    const exploreBtn = document.getElementById('main-explore-btn');
    if (exploreBtn) exploreBtn.addEventListener('click', () => this.openModal(this.exploreModal));

    // Close Explore Modal
    const exploreClose = document.getElementById('explore-close');
    if (exploreClose) exploreClose.addEventListener('click', () => this.closeModal(this.exploreModal));

    // Close on backdrop click
    [this.registerModal, this.exploreModal].forEach(modal => {
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
        this.closeModal(this.exploreModal);
      }
    });

    // Form submission
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

    // HUD stage navigation click
    const hudNodes = document.querySelectorAll('.hud-node');
    hudNodes.forEach(node => {
      node.addEventListener('click', () => {
        const target = parseFloat(node.getAttribute('data-target'));
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollY = target * maxScroll;
        if (this.lenis) {
          this.lenis.scrollTo(scrollY, { duration: 1.6 });
        } else {
          window.scrollTo({ top: scrollY, behavior: 'smooth' });
        }
      });
    });
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
