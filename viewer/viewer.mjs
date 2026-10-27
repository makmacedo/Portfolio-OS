// Pin the renderer, worker and fallback fonts to the same release.
const PDFJS_BASE = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.4.299';
let getDocument;
let TextLayer;
const pdfURL = new URL('../media/documents/Arcadio_Macedo_CV.pdf?v=92bf62ab', import.meta.url).href;
const $ = id => document.getElementById(id);
let pdf;
let currentPage = 1;
let zoom = 'fit';
let scale = 1;
let revision = 0;
let resizeTimer;
let printPreparation;
const status = message => { $('status').textContent = message; };

function updateControls() {
  $('page').value = currentPage;
  $('previous').disabled = !pdf || currentPage === 1;
  $('next').disabled = !pdf || currentPage === pdf.numPages;
  $('zoom-out').disabled = !pdf || scale <= 0.5;
  $('zoom-in').disabled = !pdf || scale >= 3;
}

async function renderPage(resetScroll = false) {
  if (!pdf) return;
  const request = ++revision;
  updateControls();
  try {
    const page = await pdf.getPage(currentPage);
    if (request !== revision) return;
    const original = page.getViewport({ scale: 1 });
    const availableWidth = $('viewport').clientWidth - (innerWidth <= 420 ? 16 : 32);
    scale = zoom === 'fit' ? Math.max(0.1, availableWidth / original.width) : Number(zoom);
    const viewport = page.getViewport({ scale });
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-page';
    wrapper.style.width = `${viewport.width}px`;
    wrapper.style.height = `${viewport.height}px`;
    wrapper.style.setProperty('--total-scale-factor', viewport.scale);
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = Math.ceil(viewport.width * ratio);
    canvas.height = Math.ceil(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    wrapper.append(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport,
      transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise;
    if (request !== revision) return;
    $('page-host').replaceChildren(wrapper);
    const text = document.createElement('div');
    text.className = 'textLayer';
    text.setAttribute('aria-label', `CV page ${currentPage}`);
    wrapper.append(text);
    await new TextLayer({ textContentSource: await page.getTextContent(), container: text, viewport }).render();
    if (request !== revision) return;
    if (resetScroll) $('viewport').scrollTo(0, 0);
    status('');
    updateControls();
  } catch (error) {
    if (request !== revision) return;
    console.error('CV render failed:', error);
    status('The preview could not be displayed. Please use Open PDF or Download above.');
  }
}

function goToPage(number) {
  if (!pdf) return;
  currentPage = Math.max(1, Math.min(pdf.numPages, Number.isFinite(number) ? Math.trunc(number) : currentPage));
  renderPage(true);
}
$('previous').addEventListener('click', () => goToPage(currentPage - 1));
$('next').addEventListener('click', () => goToPage(currentPage + 1));
$('page').addEventListener('change', event => goToPage(Number(event.target.value)));
$('zoom').addEventListener('change', event => { zoom = event.target.value; renderPage(); });
function changeZoom(delta) {
  const next = Math.max(0.5, Math.min(3, Math.round((scale + delta) * 100) / 100));
  zoom = String(next);
  const select = $('zoom');
  select.querySelector('[data-custom]')?.remove();
  if (![...select.options].some(option => option.value === zoom)) {
    const option = new Option(`${Math.round(next * 100)}%`, zoom);
    option.dataset.custom = 'true';
    select.add(option);
  }
  select.value = zoom;
  renderPage();
}
$('zoom-out').addEventListener('click', () => changeZoom(-0.25));
$('zoom-in').addEventListener('click', () => changeZoom(0.25));
new ResizeObserver(() => {
  if (!pdf || zoom !== 'fit') return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderPage(), 120);
}).observe($('viewport'));
document.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'BUTTON'].includes(event.target.tagName)) return;
  if (event.key === 'PageDown' || event.key === 'PageUp') {
    event.preventDefault();
    goToPage(currentPage + (event.key === 'PageDown' ? 1 : -1));
  }
});
// Prepare once after loading, so browser-menu printing also has every page.
// Keep the canvases after print: a second browser-menu print must work too.
function preparePrintPages() {
  if (printPreparation) return printPreparation;
  printPreparation = (async () => {
    const fragment = document.createDocumentFragment();
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const wrapper = document.createElement('div');
      wrapper.className = 'print-page';
      wrapper.append(canvas);
      fragment.append(wrapper);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport, intent: 'print' }).promise;
    }
    $('print-pages').replaceChildren(fragment);
    document.body.classList.add('print-ready');
    $('print').disabled = false;
  })().catch(error => {
    printPreparation = null;
    throw error;
  });
  return printPreparation;
}
$('print').addEventListener('click', async () => {
  if (!pdf) return;
  try {
    await preparePrintPages();
    window.print();
  } catch (error) {
    console.error('CV print failed:', error);
    status('Printing is unavailable here. Please use Open PDF or Download above.');
  }
});

try {
  // Dynamic import keeps the local viewer and its download fallback usable if the CDN fails.
  const pdfjs = await import(`${PDFJS_BASE}/build/pdf.min.mjs`);
  ({ getDocument, TextLayer } = pdfjs);
  pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/build/pdf.worker.min.mjs`;
  pdf = await getDocument({ url: pdfURL,
    standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
    isEvalSupported: false }).promise;
  $('count').textContent = `/ ${pdf.numPages}`;
  $('page').max = pdf.numPages;
  for (const id of ['page', 'zoom']) $(id).disabled = false;
  await renderPage();
  preparePrintPages().catch(error => {
    console.error('CV print preparation failed:', error);
    status('Printing is unavailable here. Please use Open PDF or Download above.');
  });
} catch (error) {
  console.error('CV load failed:', error);
  status('The CV could not be loaded. Please use Open PDF or Download above.');
}
