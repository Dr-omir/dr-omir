const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuButton) {
  menuButton.addEventListener('click', () => {
    const active = navLinks.classList.toggle('active');
    menuButton.setAttribute('aria-expanded', active ? 'true' : 'false');
  });
}

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    menuButton?.setAttribute('aria-expanded', 'false');
  });
});

// Resource search + category filter
const search = document.getElementById('resourceSearch');
const filter = document.getElementById('resourceFilter');
const cards = [...document.querySelectorAll('.resource-card')];
const emptyState = document.getElementById('emptyState');

function filterResources() {
  const term = (search?.value || '').trim().toLowerCase();
  const category = filter?.value || 'all';
  let shown = 0;

  cards.forEach(card => {
    const title = (card.dataset.title || '').toLowerCase();
    const cardCategory = card.dataset.category || 'other';
    const matchesText = !term || title.includes(term) || card.textContent.toLowerCase().includes(term);
    const matchesCategory = category === 'all' || cardCategory === category;
    const show = matchesText && matchesCategory;
    card.style.display = show ? '' : 'none';
    if (show) shown++;
  });

  if (emptyState) emptyState.style.display = shown ? 'none' : 'block';
}

search?.addEventListener('input', filterResources);
filter?.addEventListener('change', filterResources);

// Contact form -> WhatsApp
document.getElementById('contactForm')?.addEventListener('submit', event => {
  event.preventDefault();

  // CHANGE THIS NUMBER to your WhatsApp number, country code included, no + or spaces.
  const whatsappNumber = '201000000000';

  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  const text = `Hello Dr. Omir,\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});

// Reveal animations
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

document.getElementById('year').textContent = new Date().getFullYear();
