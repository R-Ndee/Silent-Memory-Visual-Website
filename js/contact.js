/**
 * SILENT MEMORY PHOTOGRAPHY - CONTACT & RESERVATION ENGINE
 * Dynamic category fields, client-side inline validation, Formspree handling,
 * and WhatsApp prefilled link generator.
 */

// Formspree endpoint placeholder constant
const FORMSPREE_ENDPOINT = "GANTI_DENGAN_ENDPOINT_ASLI"; // TODO: daftar di formspree.io, buat form baru, ganti ID di sini

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
});

function initContactForm() {
  const form = document.getElementById('booking-form');
  const categorySelect = document.getElementById('field-category');
  const successCard = document.getElementById('submit-success-card');
  const statusBanner = document.getElementById('submit-status-banner');
  const submitBtn = document.getElementById('btn-submit-form');

  if (!form || !categorySelect) return;

  // Parse URL parameters for pre-filling category and package
  const urlParams = new URLSearchParams(window.location.search);
  const paramCat = urlParams.get('category');
  const paramPkg = urlParams.get('package');

  if (paramCat) {
    categorySelect.value = paramCat;
    toggleDynamicFields(paramCat);
  }

  if (paramPkg) {
    const notesInput = document.getElementById('field-notes');
    if (notesInput) {
      notesInput.value = `Tertarik dengan paket: ${decodeURIComponent(paramPkg)}`;
    }
  }

  // Handle category selection change to toggle dynamic fields
  categorySelect.addEventListener('change', (e) => {
    const selectedCat = e.target.value;
    toggleDynamicFields(selectedCat);
  });

  // Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusBanner.classList.remove('error');
    statusBanner.style.display = 'none';

    // Validate client-side
    const isValid = validateForm(form, categorySelect.value);
    if (!isValid) return;

    // Set loading state
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'Mengirim...';
    submitBtn.disabled = true;

    // Collect form data
    const formData = new FormData(form);
    const formObj = Object.fromEntries(formData.entries());

    // Prepare WhatsApp link with data summary
    const waText = generateWhatsAppSummary(formObj);
    const waLink = `https://wa.me/6285696293686?text=${encodeURIComponent(waText)}`;

    // Open WhatsApp directly in a new tab
    window.open(waLink, '_blank');

    // Show success card on website
    showSuccessState(form, successCard, waLink);
  });
}

/**
 * Toggle dynamic fields depending on main category
 */
function toggleDynamicFields(cat) {
  const groupGradPriv = document.getElementById('group-grad-priv');
  const groupLove = document.getElementById('group-love');
  const groupEventComm = document.getElementById('group-event-comm');

  // Hide all dynamic groups first
  [groupGradPriv, groupLove, groupEventComm].forEach(grp => {
    if (grp) grp.classList.remove('active');
  });

  if (cat === 'graduation' || cat === 'private-photoshoot') {
    groupGradPriv?.classList.add('active');
  } else if (cat === 'love-package') {
    groupLove?.classList.add('active');
  } else if (cat === 'event-documentation' || cat === 'commercial') {
    groupEventComm?.classList.add('active');
  }
}

/**
 * Inline client-side validation without alerts
 */
function validateForm(form, currentCategory) {
  let valid = true;

  // Helper to mark field error
  const checkField = (inputEl, errorEl) => {
    if (!inputEl) return true;
    const value = inputEl.value.trim();
    if (!value) {
      inputEl.classList.add('error');
      if (errorEl) errorEl.classList.add('visible');
      return false;
    } else {
      inputEl.classList.remove('error');
      if (errorEl) errorEl.classList.remove('visible');
      return true;
    }
  };

  // Base required fields
  const nameOk = checkField(
    document.getElementById('field-name'),
    document.getElementById('error-name')
  );
  const waOk = checkField(
    document.getElementById('field-wa'),
    document.getElementById('error-wa')
  );
  const catOk = checkField(
    document.getElementById('field-category'),
    document.getElementById('error-category')
  );

  valid = nameOk && waOk && catOk;

  // Dynamic required fields based on category
  if (currentCategory === 'graduation' || currentCategory === 'private-photoshoot') {
    const dateOk = checkField(document.getElementById('field-grad-date'), document.getElementById('error-grad-date'));
    const locOk = checkField(document.getElementById('field-grad-loc'), document.getElementById('error-grad-loc'));
    valid = valid && dateOk && locOk;
  } else if (currentCategory === 'love-package') {
    const dateOk = checkField(document.getElementById('field-love-date'), document.getElementById('error-love-date'));
    const locOk = checkField(document.getElementById('field-love-loc'), document.getElementById('error-love-loc'));
    const subOk = checkField(document.getElementById('field-love-subcat'), document.getElementById('error-love-subcat'));
    valid = valid && dateOk && locOk && subOk;
  } else if (currentCategory === 'event-documentation' || currentCategory === 'commercial') {
    const dateOk = checkField(document.getElementById('field-event-date'), document.getElementById('error-event-date'));
    const locOk = checkField(document.getElementById('field-event-loc'), document.getElementById('error-event-loc'));
    const descOk = checkField(document.getElementById('field-event-desc'), document.getElementById('error-event-desc'));
    valid = valid && dateOk && locOk && descOk;
  }

  return valid;
}

/**
 * Format structured WhatsApp summary text from form inputs
 */
function generateWhatsAppSummary(data) {
  let text = `Halo Silent Memory, saya ingin reservasi/konsultasi:\n\n`;
  text += `• Nama: ${data.name || '-'}\n`;
  text += `• WhatsApp: ${data.wa || '-'}\n`;
  text += `• Kategori: ${(data.category || '').toUpperCase()}\n`;

  if (data.category === 'graduation' || data.category === 'private-photoshoot') {
    text += `• Tanggal: ${data.grad_date || '-'}\n`;
    text += `• Lokasi: ${data.grad_loc || '-'}\n`;
  } else if (data.category === 'love-package') {
    text += `• Sub-Kategori: ${data.love_subcat || '-'}\n`;
    text += `• Tanggal Acara: ${data.love_date || '-'}\n`;
    text += `• Lokasi Acara: ${data.love_loc || '-'}\n`;
  } else if (data.category === 'event-documentation' || data.category === 'commercial') {
    text += `• Tanggal Acara: ${data.event_date || '-'}\n`;
    text += `• Lokasi Acara: ${data.event_loc || '-'}\n`;
    text += `• Deskripsi Kebutuhan: ${data.event_desc || '-'}\n`;
  }

  if (data.notes) {
    text += `• Catatan: ${data.notes}\n`;
  }

  return text;
}

function showSuccessState(form, successCard, waLink) {
  form.style.display = 'none';
  if (successCard) {
    successCard.classList.add('active');
    const waBtn = document.getElementById('btn-success-wa');
    if (waBtn) {
      waBtn.setAttribute('href', waLink);
    }
  }
}

function showErrorState(statusBanner, msg, submitBtn, originalText) {
  if (statusBanner) {
    statusBanner.innerText = msg;
    statusBanner.style.display = 'block';
    statusBanner.classList.add('error');
  }
  if (submitBtn) {
    submitBtn.innerText = originalText;
    submitBtn.disabled = false;
  }
}
