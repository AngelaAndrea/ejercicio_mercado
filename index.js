// Importa Playwright y el navegador Chromium
const { chromium } = require('playwright');
// Importa el sistema de archivos para guardar imágenes y el reporte
const fs = require('fs');
// Para trabajar con rutas de archivos
const path = require('path');

// Define carpeta para guardar screenshots
const screenshotsDir = './screenshots';
// Crea la carpeta si no existe
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

// Función principal asíncrona
(async () => {
  // Inicia el navegador (modo visible)
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const steps = []; // Guarda pasos con título y screenshot
  const products = []; // Guarda productos obtenidos

  // Paso 1: Ir a Mercado Libre principal
  await page.goto('https://www.mercadolibre.com');
  await page.waitForLoadState('domcontentloaded');
  await capturarPaso(page, steps, 'Abrir sitio principal', 'step1_home.png');

  // Paso 2: Seleccionar México
  const mexicoBtn = await page.waitForSelector('//*[@id="MX"]', { timeout: 10000 });
  await mexicoBtn.click();
  await page.waitForLoadState('domcontentloaded');
  await capturarPaso(page, steps, 'Seleccionar Mexico', 'step2_mexico.png');

  // Paso 3: Buscar "Playstation 5"
  await page.locator('input[name="as_word"]').fill('playstation 5');
  await page.keyboard.press('Enter');
  await page.waitForSelector('li.ui-search-layout__item', { timeout: 10000 });
  await capturarPaso(page, steps, 'Realizar búsqueda', 'step3_busqueda.png');

  // Paso 4: Filtrar por estado "Nuevo"
  await page.waitForSelector('span.ui-search-filter-name:has-text("Nuevo")');
  await page.click('span.ui-search-filter-name:has-text("Nuevo")');
  await page.waitForTimeout(4000); // Esperar que se aplique filtro
  await capturarPaso(page, steps, 'Filtrar por Nuevo', 'step4_nuevo.png');

  // Paso 5: Filtrar por ubicación "CDMX"
  const mostrarMasBtn = await page.$('a.ui-search-see-more__link:has-text("Mostrar más")');
  if (mostrarMasBtn) {
    await mostrarMasBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.waitForSelector('span.ui-search-filter-name:has-text("Distrito Federal")', { timeout: 5000 });
  await page.click('span.ui-search-filter-name:has-text("Distrito Federal")');
  await page.waitForTimeout(2000);
  await capturarPaso(page, steps, 'Filtrar por CDMX', 'step5_cdmx.png');

  // Paso 6: Ordenar por "Mayor precio"
  const ordenarPorDropdown = 'xpath=//*[@id="root-app"]/div/div[2]/section/div[2]/div[2]/div/div/div[1]';
  const mayorPrecioOption = 'xpath=//*[@id="root-app"]/div/div[2]/section/div[2]/div[2]/div/div/div[2]';
  const opcionMayorPrecio = 'xpath=//*[@id=":R1b56ie:-menu-list-option-price_desc"]';
  await page.click(ordenarPorDropdown);
  await page.waitForSelector(mayorPrecioOption, { timeout: 5000 });
  await page.click(mayorPrecioOption);
  await page.waitForSelector(opcionMayorPrecio, { timeout: 5000 });
  await page.click(opcionMayorPrecio);
  await page.waitForTimeout(3000);
  await capturarPaso(page, steps, 'Ordenar por mayor precio', 'step6_orden.png');

  // Paso 7: Obtener datos de los primeros 5 productos
  await page.waitForSelector('li.ui-search-layout__item', { timeout: 10000 });
  const items = await page.$$('li.ui-search-layout__item');

  for (let i = 0; i < Math.min(5, items.length); i++) {
    const item = items[i];

    // Obtiene nombre y precio del producto
    const nameElement = await item.$('h3 > a');
    const priceWholeElement = await item.$('span.andes-money-amount__fraction');
    const priceCentsElement = await item.$('span.andes-money-amount__cents');

    const name = nameElement ? await nameElement.innerText() : 'Sin nombre';
    let price = priceWholeElement ? await priceWholeElement.innerText() : 'Sin precio';
    if (price !== 'Sin precio' && priceCentsElement) {
      const cents = await priceCentsElement.innerText();
      price += `.${cents}`;
    }

    price = price.replace(/,/g, ''); // Eliminar comas del precio

    console.log(`${i + 1}. ${name} - ${price !== 'Sin precio' ? `$${price}` : price}`);
    products.push({ name, price });
  }

  await capturarPaso(page, steps, 'Productos obtenidos', 'step7_resultado.png');

  // Cierra el navegador
  await browser.close();

  // Paso 8: Generar reporte HTML
  generarReporteHTML(steps, products);
})();

/**
 * Función auxiliar para capturar un paso con screenshot y agregarlo al reporte
 */
async function capturarPaso(page, steps, titulo, archivo) {
  const ruta = path.join(screenshotsDir, archivo);
  await page.screenshot({ path: ruta });
  steps.push({ title: titulo, path: ruta });
}

/**
 * Genera un archivo HTML con los pasos de ejecución y productos encontrados
 */
function generarReporteHTML(steps, products) {
  // Convierte las imágenes a base64 para incrustarlas en el HTML
  const stepsWithImages = steps.map(step => {
    const imageData = fs.readFileSync(step.path);
    const base64Image = imageData.toString('base64');
    return {
      ...step,
      imageSrc: `data:image/png;base64,${base64Image}`
    };
  });

  // Plantilla HTML del reporte
  const htmlContent = `
  <html>
  <head>
    <title>Reporte de Ejecucion</title>
    <style>
      body { font-family: Arial; padding: 20px; }
      h1 { color: #333; }
      .step { margin-bottom: 30px; border-bottom: 1px solid #eee; }
      img { max-width: 800px; border: 1px solid #ccc; margin-top: 10px; display: block; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f2f2f2; }
    </style>
  </head>
  <body>
    <h1>Reporte de Automatización Mercado Libre</h1>

    <h2>Pasos de Ejecucion</h2>
    ${stepsWithImages.map(step => `
      <div class="step">
        <h3>${step.title}</h3>
        <img src="${step.imageSrc}" alt="${step.title}" />
      </div>
    `).join('')}

    <h2>Productos Obtenidos (Top 5)</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Nombre</th>
          <th>Precio (MXN)</th>
        </tr>
      </thead>
      <tbody>
        ${products.map((p, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td>$${p.price}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="margin-top: 30px; color: #666;">Reporte generado el ${new Date().toLocaleString()}</p>
  </body>
  </html>
  `;

  // Guarda el reporte como archivo HTML
  const reportPath = path.join(__dirname, 'reporte.html');
  fs.writeFileSync(reportPath, htmlContent);
  console.log('✅ Reporte generado: reporte.html');
}
