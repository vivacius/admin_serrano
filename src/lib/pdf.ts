import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { MovimientoCuenta, ReciboDatos } from './types'
import { MEDIOS, formatCOP, formatFecha } from './utils'

const AZUL_SERRANO: [number, number, number] = [10, 122, 120]
const AZUL_SERRANO_OSCURO: [number, number, number] = [6, 75, 74]
const AZUL_CLARO: [number, number, number] = [238, 249, 248]
const GRIS: [number, number, number] = [95, 115, 112]
const BORDE: [number, number, number] = [185, 215, 212]
const EMPRESA = 'SERRANO Gestión Inmobiliaria'

export function sanitizarNombreArchivo(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Quitar caracteres no permitidos en nombres de archivo
    .replace(/_+/g, '_')            // Colapsar guiones bajos múltiples
    .replace(/^_|_$/g, '')          // Recortar extremos
}

export function nombreArchivoEstadoCuenta(d: {
  codigoVenta: string
  proyecto: string
  lote: string
  comprador?: string
  corte?: string
}): string {
  const proj = sanitizarNombreArchivo(d.proyecto)
  const lote = sanitizarNombreArchivo(d.lote)
  const comp = d.comprador
    ? `_${sanitizarNombreArchivo(d.comprador.split(' ').slice(0, 2).join('_'))}`
    : ''
  const fecha = d.corte ? `_${d.corte}` : ''
  return `Estado_Cuenta_${d.codigoVenta}_${proj}_Lote_${lote}${comp}${fecha}.pdf`
}

export function nombreArchivoRecibo(d: {
  numero: number | null
  codigoVenta: string
  proyecto: string
  lote: string
  comprador?: string
  fechaPago?: string
}): string {
  const num = d.numero !== null ? `Recibo_${String(d.numero).padStart(6, '0')}` : 'Recibo_Borrador'
  const proj = sanitizarNombreArchivo(d.proyecto)
  const lote = sanitizarNombreArchivo(d.lote)
  const comp = d.comprador
    ? `_${sanitizarNombreArchivo(d.comprador.split(' ').slice(0, 2).join('_'))}`
    : ''
  const fecha = d.fechaPago ? `_${d.fechaPago}` : ''
  return `${num}_${d.codigoVenta}_${proj}_Lote_${lote}${comp}${fecha}.pdf`
}

async function cargarLogo(): Promise<string | null> {
  try {
    const blob = await (await fetch('/logo.png')).blob()
    return await new Promise((res) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.readAsDataURL(blob)
    })
  } catch { return null }
}

async function encabezado(
  doc: jsPDF,
  titulo: string,
  derecha: string[],
  preliminar: boolean,
  ancho = 210,
  centrarTitulo = false
) {
  const logo = await cargarLogo()
  doc.setFillColor(...AZUL_SERRANO); doc.rect(0, 0, ancho, 27, 'F')
  if (logo) {
    // logo_sin_fondo.png tiene aspecto 2.4:1 (36mm x 15mm)
    doc.addImage(logo, 'PNG', 14, 6, 36, 15)
  }
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  if (centrarTitulo) {
    doc.text(titulo, ancho / 2, 17.5, { align: 'center' })
  } else {
    doc.text(titulo, logo ? 55 : 14, 17.5)
  }
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  derecha.forEach((l, i) => doc.text(l, ancho - 14, 11 + i * 5.5, { align: 'right' }))
  if (preliminar) {
    doc.setTextColor(220, 50, 50); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
    doc.text('VISTA PRELIMINAR — SIN VALIDEZ FISCAL NI CONTRACTUAL', ancho / 2, 34, { align: 'center' })
  }
  doc.setTextColor(30)
}

export async function generarReciboPDF(d: ReciboDatos): Promise<jsPDF> {
  const doc = new jsPDF()
  const prelim = d.numero === null

  const nombreSugerido = nombreArchivoRecibo(d)
  doc.setProperties({
    title: nombreSugerido.replace(/\.pdf$/i, ''),
    subject: `Recibo de abono - Negociación ${d.codigoVenta} - ${d.comprador}`,
    author: EMPRESA,
    creator: EMPRESA,
  })

  await encabezado(doc, 'RECIBO OFICIAL DE ABONO', [
    prelim ? 'N.º: Asignado al confirmar' : `RECIBO N.º ${String(d.numero).padStart(6, '0')}`,
    `Fecha emisión: ${formatFecha(d.fecha)}`,
  ], prelim)

  let startY = prelim ? 43 : 37

  // 1. Tarjeta Hero del Abono (Color azul corporativo Serrano)
  doc.setFillColor(...AZUL_CLARO)
  doc.setDrawColor(...AZUL_SERRANO)
  doc.setLineWidth(0.4)
  doc.roundedRect(14, startY, 182, 21, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...AZUL_SERRANO_OSCURO)
  doc.text('VALOR DEL ABONO RECIBIDO', 20, startY + 6.5)
  doc.setFontSize(15); doc.setTextColor(6, 65, 64)
  doc.text(formatCOP(d.valorAbono), 20, startY + 15.5)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 65, 62)
  doc.text(`Medio: ${MEDIOS[d.medio] ?? d.medio}${d.banco ? ` · ${d.banco}` : ''}`, 190, startY + 8, { align: 'right' })
  doc.text(`Fecha aplicación: ${formatFecha(d.fechaPago)}${d.referencia ? ` · Ref: ${d.referencia}` : ''}`, 190, startY + 15, { align: 'right' })

  // 2. Información de las Partes y Negociación (Con bordes en cuadrícula)
  autoTable(doc, {
    startY: startY + 25,
    theme: 'grid',
    tableLineColor: BORDE,
    tableLineWidth: 0.25,
    styles: { fontSize: 8.5, cellPadding: 2.2, lineColor: BORDE, lineWidth: 0.25 },
    head: [[
      { content: 'DATOS DEL COMPRADOR', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [242, 250, 249], textColor: AZUL_SERRANO_OSCURO } },
      { content: 'DATOS DE LA NEGOCIACIÓN', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [242, 250, 249], textColor: AZUL_SERRANO_OSCURO } },
    ]],
    body: [
      [
        { content: 'Comprador:', styles: { textColor: GRIS, cellWidth: 26 } },
        { content: d.comprador, styles: { fontStyle: 'bold', cellWidth: 65 } },
        { content: 'Proyecto:', styles: { textColor: GRIS, cellWidth: 26 } },
        { content: d.proyecto, styles: { fontStyle: 'bold', cellWidth: 65 } },
      ],
      [
        { content: 'Documento:', styles: { textColor: GRIS } },
        { content: d.documento, styles: { fontStyle: 'bold' } },
        { content: 'Lote:', styles: { textColor: GRIS } },
        { content: d.lote, styles: { fontStyle: 'bold' } },
      ],
      [
        { content: 'Teléfono:', styles: { textColor: GRIS } },
        { content: d.telefono || '—', styles: { fontStyle: 'bold' } },
        { content: 'Código venta:', styles: { textColor: GRIS } },
        { content: d.codigoVenta, styles: { fontStyle: 'bold' } },
      ],
    ],
  })

  // 3. Tabla Resumen Financiero con bordes
  const pctAnt = d.valorNegocio > 0 ? ((d.totalAnterior / d.valorNegocio) * 100).toFixed(1) : '0'
  const pctAbono = d.valorNegocio > 0 ? ((d.valorAbono / d.valorNegocio) * 100).toFixed(1) : '0'
  const pctAcum = d.valorNegocio > 0 ? ((d.totalAcumulado / d.valorNegocio) * 100).toFixed(1) : '0'
  const pctSaldo = d.valorNegocio > 0 ? ((d.saldoNuevo / d.valorNegocio) * 100).toFixed(1) : '0'

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    theme: 'grid',
    tableLineColor: BORDE,
    tableLineWidth: 0.25,
    head: [['Concepto Financiero', 'Descripción del Movimiento', 'Monto en COP', '% Participación']],
    body: [
      ['Valor total acordado', `Precio pactado lote ${d.lote}`, formatCOP(d.valorNegocio), '100.0 %'],
      ['Total abonado anteriormente', 'Saldo acumulado previo a este recibo', formatCOP(d.totalAnterior), `${pctAnt} %`],
      ['+ ABONO RECIBIDO (ESTE RECIBO)', 'Abono aplicado directamente a capital', formatCOP(d.valorAbono), `${pctAbono} %`],
      ['Total acumulado pagado', 'Total recaudado amortizado a la fecha', formatCOP(d.totalAcumulado), `${pctAcum} %`],
      ['NUEVO SALDO PENDIENTE', 'Saldo restante por cancelar', formatCOP(d.saldoNuevo), `${pctSaldo} %`],
    ],
    headStyles: { fillColor: AZUL_SERRANO, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.8, lineColor: BORDE, lineWidth: 0.25 },
    alternateRowStyles: { fillColor: [248, 252, 251] },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: 'bold' },
      1: { cellWidth: 55, textColor: [85, 105, 100] },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 38 },
      3: { halign: 'right', cellWidth: 27 },
    },
    didParseCell: (data) => {
      // Resaltar la fila del abono actual en azul/teal suave
      if (data.row.index === 2 && data.section === 'body') {
        data.cell.styles.fillColor = [224, 246, 244]
        data.cell.styles.textColor = [6, 75, 74]
      }
      // Resaltar el saldo restante
      if (data.row.index === 4 && data.section === 'body') {
        data.cell.styles.textColor = [160, 50, 30]
      }
    },
  })

  // 4. Observaciones adicionales (sin duplicar datos ya presentes en el encabezado o hero card)
  if (d.observaciones) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      theme: 'grid',
      tableLineColor: BORDE,
      tableLineWidth: 0.25,
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: BORDE, lineWidth: 0.25 },
      body: [[
        { content: 'Observaciones / Notas:', styles: { fontStyle: 'bold', textColor: AZUL_SERRANO_OSCURO, cellWidth: 42 } },
        { content: d.observaciones, styles: { cellWidth: 140 } },
      ]],
    })
  }

  // 5. Bloque de Firmas Formales
  const finalY = (doc as any).lastAutoTable.finalY
  const firmaY = Math.max(finalY + 22, 242)

  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(22, firmaY, 88, firmaY)
  doc.line(122, firmaY, 188, firmaY)

  doc.setFontSize(8); doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal')
  doc.text('FIRMA / RECIBÍ CONFORME', 55, firmaY + 5, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
  doc.text(d.comprador, 55, firmaY + 9, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS)
  doc.text(d.documento, 55, firmaY + 13, { align: 'center' })

  doc.setFontSize(8); doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal')
  doc.text('SERRANO GESTIÓN INMOBILIARIA', 155, firmaY + 5, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
  doc.text('Cartera y Tesorería', 155, firmaY + 9, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS)
  doc.text('Constancia de abono oficial', 155, firmaY + 13, { align: 'center' })

  // Pie de página legal
  doc.setFontSize(7.5); doc.setTextColor(130)
  doc.text(
    `${EMPRESA} · Soporte de recaudo generado conforme a las políticas de cartera y registros de la plataforma SERRANO.`,
    105, 285, { align: 'center' }
  )

  return doc
}

export interface DatosEstadoCuenta {
  comprador: string; documento: string; proyecto: string; lote: string; codigoVenta: string
  fechaNegociacion: string; valorNegocio: number; totalRecaudado: number; saldo: number
  porcentaje: number; corte: string; movimientos: MovimientoCuenta[]
}

export async function generarEstadoCuentaPDF(d: DatosEstadoCuenta): Promise<jsPDF> {
  // Disposición horizontal (A4 landscape: 297mm ancho x 210mm alto)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const anchoPagina = 297
  const margen = 14
  const anchoUtil = anchoPagina - margen * 2 // 269mm

  const nombreSugerido = nombreArchivoEstadoCuenta(d)
  doc.setProperties({
    title: nombreSugerido.replace(/\.pdf$/i, ''),
    subject: `Estado de Cuenta de Cartera - Negociación ${d.codigoVenta} - ${d.comprador}`,
    author: EMPRESA,
    creator: EMPRESA,
  })

  await encabezado(doc, 'ESTADO DE CUENTA DE CARTERA', [
    `Fecha corte: ${formatFecha(d.corte)}`,
    `Negociación: ${d.codigoVenta}`,
  ], false, anchoPagina, true)

  // 1. Fila Superior: Lado Izquierdo (Titular e Inmueble) y Lado Derecho (Tarjetas de Valores)
  const yTop = 33
  const hTop = 39
  const gapCol = 5
  const wCol = (anchoUtil - gapCol) / 2 // 132mm

  // --- LADO IZQUIERDO: Tarjeta del Comprador (Titular) + Lote / Negociación ---
  const xIzq = margen
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...BORDE)
  doc.setLineWidth(0.35)
  doc.roundedRect(xIzq, yTop, wCol, hTop, 2, 2, 'FD')

  // Barra de acento lateral teal
  doc.setFillColor(...AZUL_SERRANO)
  doc.roundedRect(xIzq, yTop, 3, hTop, 1, 1, 'F')

  // Etiqueta Titular
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...AZUL_SERRANO_OSCURO)
  doc.text('TITULAR DE LA CUENTA / COMPRADOR', xIzq + 7, yTop + 6)

  // Nombre Comprador en tipografía grande y destacada
  doc.setFontSize(12.5); doc.setTextColor(15, 30, 28)
  doc.text(d.comprador, xIzq + 7, yTop + 13.5)

  // Documento / Identificación
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS)
  doc.text(`Identificación: ${d.documento}`, xIzq + 7, yTop + 19)

  // Línea divisoria interna
  doc.setDrawColor(230, 240, 238); doc.setLineWidth(0.3)
  doc.line(xIzq + 7, yTop + 22.5, xIzq + wCol - 7, yTop + 22.5)

  // Información del Inmueble y Negociación
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(15, 30, 28)
  doc.text(`${d.proyecto}  —  Lote ${d.lote}`, xIzq + 7, yTop + 29)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS)
  doc.text(`Código de venta: ${d.codigoVenta}   |   Fecha de contrato: ${formatFecha(d.fechaNegociacion)}`, xIzq + 7, yTop + 35)

  // --- LADO DERECHO: Tarjetas de Valores Financieros (Grid 2x2) ---
  const xDer = xIzq + wCol + gapCol
  const wCard = (wCol - 4) / 2 // 64mm
  const hCard = (hTop - 3) / 2 // 18mm
  const xCol1 = xDer
  const xCol2 = xDer + wCard + 4
  const yFila1 = yTop
  const yFila2 = yTop + hCard + 3

  // Tarjeta 1: Valor total del negocio
  doc.setFillColor(248, 252, 251); doc.setDrawColor(...BORDE); doc.setLineWidth(0.3)
  doc.roundedRect(xCol1, yFila1, wCard, hCard, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...GRIS)
  doc.text('VALOR TOTAL DEL NEGOCIO', xCol1 + 4, yFila1 + 5.2)
  doc.setFontSize(9.5); doc.setTextColor(25, 40, 38)
  doc.text(formatCOP(d.valorNegocio), xCol1 + 4, yFila1 + 11.2)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(130, 145, 140)
  doc.text('Precio total acordado', xCol1 + 4, yFila1 + 15.5)

  // Tarjeta 2: Total recaudado (Acento Teal Serrano)
  doc.setFillColor(236, 249, 247); doc.setDrawColor(...AZUL_SERRANO); doc.setLineWidth(0.35)
  doc.roundedRect(xCol2, yFila1, wCard, hCard, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...AZUL_SERRANO_OSCURO)
  doc.text('TOTAL RECAUDADO', xCol2 + 4, yFila1 + 5.2)
  doc.setFontSize(9.5); doc.setTextColor(...AZUL_SERRANO_OSCURO)
  doc.text(formatCOP(d.totalRecaudado), xCol2 + 4, yFila1 + 11.2)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...AZUL_SERRANO)
  doc.text('Amortizado a capital', xCol2 + 4, yFila1 + 15.5)

  // Tarjeta 3: Saldo pendiente (Acento Ámbar / Terracota)
  doc.setFillColor(254, 248, 245); doc.setDrawColor(220, 140, 100); doc.setLineWidth(0.35)
  doc.roundedRect(xCol1, yFila2, wCard, hCard, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(170, 60, 25)
  doc.text('SALDO PENDIENTE', xCol1 + 4, yFila2 + 5.2)
  doc.setFontSize(9.5); doc.setTextColor(170, 50, 20)
  doc.text(formatCOP(d.saldo), xCol1 + 4, yFila2 + 11.2)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(180, 80, 40)
  doc.text('Capital pendiente de cobro', xCol1 + 4, yFila2 + 15.5)

  // Tarjeta 4: Avance de pago (% Total)
  doc.setFillColor(248, 252, 251); doc.setDrawColor(...BORDE); doc.setLineWidth(0.3)
  doc.roundedRect(xCol2, yFila2, wCard, hCard, 1.5, 1.5, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...GRIS)
  doc.text('AVANCE DE PAGO (% TOTAL)', xCol2 + 4, yFila2 + 5.2)
  doc.setFontSize(10); doc.setTextColor(...AZUL_SERRANO)
  doc.text(`${d.porcentaje.toFixed(2)} %`, xCol2 + 4, yFila2 + 11.2)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(130, 145, 140)
  doc.text('Porcentaje amortizado', xCol2 + 4, yFila2 + 15.5)

  // 2. Tabla Inferior de Abonos Numerados (1, 2, 3...)
  // Columnas: N.º, Fecha Pago, Recibo N.º, Medio de Pago, Referencia / Soporte, Valor Abono, Saldo Posterior
  autoTable(doc, {
    startY: yTop + hTop + 5,
    margin: { left: margen, right: margen },
    theme: 'grid',
    tableLineColor: BORDE,
    tableLineWidth: 0.25,
    head: [['N.º', 'Fecha Pago', 'Recibo N.º', 'Medio de Pago', 'Referencia / Soporte', 'Valor Abono', 'Saldo Posterior']],
    body: d.movimientos.map((m, idx) => [
      String(idx + 1),
      formatFecha(m.fecha) + (m.pendiente_completar ? ' *' : ''),
      m.recibo_numero ? `#${String(m.recibo_numero).padStart(6, '0')}` : '—',
      m.medio ? (MEDIOS[m.medio] ?? m.medio) : '—',
      m.referencia ?? '—',
      formatCOP(m.valor),
      formatCOP(m.saldo_posterior),
    ]),
    headStyles: { fillColor: AZUL_SERRANO, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2.6, lineColor: BORDE, lineWidth: 0.25 },
    alternateRowStyles: { fillColor: [248, 252, 251] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold', textColor: AZUL_SERRANO_OSCURO },
      1: { cellWidth: 32 },
      2: { cellWidth: 28, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 42 },
      4: { cellWidth: 47 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 53, textColor: AZUL_SERRANO_OSCURO },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 53 },
    },
  })

  // 3. Bloque de Firmas y Certificación
  const finalY = (doc as any).lastAutoTable.finalY
  const firmaY = Math.max(finalY + 16, 168)

  doc.setDrawColor(160)
  doc.setLineWidth(0.3)
  doc.line(35, firmaY, 115, firmaY)
  doc.line(182, firmaY, 262, firmaY)

  doc.setFontSize(8); doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal')
  doc.text('FIRMA CLIENTE / TITULAR', 75, firmaY + 5, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
  doc.text(d.comprador, 75, firmaY + 9, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS)
  doc.text(`C.C. ${d.documento}`, 75, firmaY + 13, { align: 'center' })

  doc.setFontSize(8); doc.setTextColor(...GRIS); doc.setFont('helvetica', 'normal')
  doc.text('SERRANO GESTIÓN INMOBILIARIA', 222, firmaY + 5, { align: 'center' })
  doc.setFont('helvetica', 'bold'); doc.setTextColor(30)
  doc.text('Cartera y Tesorería', 222, firmaY + 9, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS)
  doc.text('Certificación oficial de estado de cuenta', 222, firmaY + 13, { align: 'center' })

  if (d.movimientos.some((m) => m.pendiente_completar)) {
    doc.setFontSize(7.5); doc.setTextColor(...GRIS)
    doc.text('* Movimiento con datos pendientes de completar en fecha o soporte de origen.', margen, 196)
  }

  doc.setFontSize(7.5); doc.setTextColor(130)
  doc.text(
    `${EMPRESA} · Estado de cuenta oficial expedido a solicitud de la parte interesada.`,
    anchoPagina / 2, 202, { align: 'center' }
  )

  return doc
}

export function descargarPDF(doc: jsPDF, nombre: string) {
  const filename = nombre.toLowerCase().endsWith('.pdf') ? nombre : `${nombre}.pdf`
  doc.setProperties({
    title: filename.replace(/\.pdf$/i, ''),
    author: EMPRESA,
    creator: EMPRESA,
  })
  try {
    doc.save(filename)
  } catch {
    const blob = doc.output('blob')
    const file = new File([blob], filename, { type: 'application/pdf' })
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }
}

export function abrirOImprimirPDF(doc: jsPDF, nombre: string, autoImprimir = false) {
  const filename = nombre.toLowerCase().endsWith('.pdf') ? nombre : `${nombre}.pdf`
  doc.setProperties({
    title: filename.replace(/\.pdf$/i, ''),
    author: EMPRESA,
    creator: EMPRESA,
  })
  if (autoImprimir) {
    doc.autoPrint()
  }
  const blob = doc.output('blob')
  const file = new File([blob], filename, { type: 'application/pdf' })
  const url = URL.createObjectURL(file)
  const win = window.open(url, '_blank')
  if (!win) {
    descargarPDF(doc, filename)
  }
  setTimeout(() => URL.revokeObjectURL(url), 120000)
}

export async function compartirWhatsApp(doc: jsPDF, nombre: string, texto: string) {
  const filename = nombre.toLowerCase().endsWith('.pdf') ? nombre : `${nombre}.pdf`
  doc.setProperties({
    title: filename.replace(/\.pdf$/i, ''),
    author: EMPRESA,
    creator: EMPRESA,
  })
  const file = new File([doc.output('blob')], filename, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text: texto })
    return 'compartido'
  }
  // Sin Web Share de archivos: se descarga el PDF con su nombre descriptivo y se abre WhatsApp
  descargarPDF(doc, filename)
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')
  return 'manual'
}
