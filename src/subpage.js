/**
 * RITHMOS Subpages Client Script
 * Handles navigation, registration modal triggers, and form interactions for /about, /competition, /contact
 */

document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav link based on current path
  const currentPath = window.location.pathname.replace(/\/$/, '');
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href').replace(/\/$/, '');
    if (href === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Modal Setup
  const registerModal = document.getElementById('register-modal');
  const modalCloseBtn = document.getElementById('modal-close');
  const openButtons = document.querySelectorAll('.open-band-modal-btn');

  function openModal() {
    if (registerModal) {
      registerModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (registerModal) {
      registerModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  openButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (registerModal) {
    registerModal.addEventListener('click', (e) => {
      if (e.target === registerModal) {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && registerModal && registerModal.classList.contains('open')) {
      closeModal();
    }
  });

  // Modal Registration Form Handling
  const regForm = document.getElementById('registration-form');
  const successMsg = document.getElementById('form-success-msg');
  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (successMsg) {
        successMsg.style.display = 'block';
        regForm.reset();
        setTimeout(() => {
          closeModal();
          successMsg.style.display = 'none';
        }, 3000);
      }
    });
  }

  // FAQ Accordion Interaction
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close others for clean accordion feel
        faqItems.forEach((other) => {
          if (other !== item) {
            other.classList.remove('open');
            other.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
          }
        });
        if (isOpen) {
          item.classList.remove('open');
          questionBtn.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('open');
          questionBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });

  // Department Channel Route Buttons
  const routeButtons = document.querySelectorAll('.channel-route-btn');
  const deptSelect = document.getElementById('c-dept');
  routeButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetVal = btn.getAttribute('data-dept-val');
      if (deptSelect && targetVal) {
        deptSelect.value = targetVal;
        const deskSection = document.getElementById('transmission-desk');
        if (deskSection) {
          deskSection.scrollIntoView({ behavior: 'smooth' });
        }
        deptSelect.focus();
      }
    });
  });

  // Message Character Counter
  const messageInput = document.getElementById('c-msg');
  const charCounter = document.getElementById('char-counter');
  if (messageInput && charCounter) {
    messageInput.addEventListener('input', () => {
      const len = messageInput.value.length;
      charCounter.textContent = `${len} / 500`;
    });
  }

  // Contact Form Handling (on /contact)
  const contactForm = document.getElementById('subpage-contact-form');
  const contactSuccess = document.getElementById('contact-form-success');
  const contactSubmitBtn = document.getElementById('contact-submit-btn');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = true;
        contactSubmitBtn.innerHTML = '<span>Sending Message...</span>';
      }

      setTimeout(() => {
        if (contactSuccess) {
          contactSuccess.style.display = 'block';
        }
        contactForm.reset();
        if (charCounter) {
          charCounter.textContent = '0 / 500';
        }
        if (contactSubmitBtn) {
          contactSubmitBtn.disabled = false;
          contactSubmitBtn.innerHTML = '<span>Send Message</span> <span class="btn-arrow">&rarr;</span>';
        }
        setTimeout(() => {
          if (contactSuccess) {
            contactSuccess.style.display = 'none';
          }
        }, 7000);
      }, 700);
    });
  }

  // Band Registration Form Handling (on /register)
  const bandForm = document.getElementById('band-registration-form');
  const bandSuccess = document.getElementById('band-form-success');
  const bandSubmitBtn = document.getElementById('band-submit-btn');
  const bandRefCode = document.getElementById('band-ref-code');

  if (bandForm) {
    bandForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (bandSubmitBtn) {
        bandSubmitBtn.disabled = true;
        bandSubmitBtn.innerHTML = '<span>Transmitting Band Dossier...</span>';
      }

      setTimeout(() => {
        const randCode = 'RTH-2026-BND-' + Math.floor(1000 + Math.random() * 9000);
        if (bandRefCode) {
          bandRefCode.textContent = randCode;
        }
        if (bandSuccess) {
          bandSuccess.style.display = 'block';
          bandSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        bandForm.reset();
        if (bandSubmitBtn) {
          bandSubmitBtn.disabled = false;
          bandSubmitBtn.innerHTML = '<span>SUBMIT BAND FOR AUDITION</span> <span class="btn-arrow">&rarr;</span>';
        }
      }, 800);
    });
  }

  // Sponsor Inquiry Form Handling (on /sponsors)
  const sponsorForm = document.getElementById('sponsor-inquiry-form');
  const sponsorSuccess = document.getElementById('sponsor-form-success');
  const sponsorSubmitBtn = document.getElementById('sponsor-submit-btn');
  const sponsorRefCode = document.getElementById('sponsor-ref-code');

  if (sponsorForm) {
    sponsorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (sponsorSubmitBtn) {
        sponsorSubmitBtn.disabled = true;
        sponsorSubmitBtn.innerHTML = '<span>Transmitting Prospectus Request...</span>';
      }

      setTimeout(() => {
        const randCode = 'RTH-2026-SPN-' + Math.floor(1000 + Math.random() * 9000);
        if (sponsorRefCode) {
          sponsorRefCode.textContent = randCode;
        }
        if (sponsorSuccess) {
          sponsorSuccess.style.display = 'block';
          sponsorSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        sponsorForm.reset();
        if (sponsorSubmitBtn) {
          sponsorSubmitBtn.disabled = false;
          sponsorSubmitBtn.innerHTML = '<span>TRANSMIT PROSPECTUS REQUEST</span> <span class="btn-arrow">&rarr;</span>';
        }
      }, 800);
    });
  }

  // Direct PDF Deck Download Trigger (on /sponsors)
  const downloadBtns = document.querySelectorAll('#quick-download-deck-btn, #direct-pdf-btn');
  downloadBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>Downloading Prospectus PDF...</span>';
      setTimeout(() => {
        // Trigger simulated PDF download prompt
        const link = document.createElement('a');
        link.href = '/assets/logo.png';
        link.download = 'RITHMOS-2026-Festival-Sponsorship-Prospectus.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        btn.innerHTML = '<span>✓ Prospectus Downloaded</span>';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 3000);
      }, 600);
    });
  });
});

