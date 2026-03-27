import { PDFDocument } from 'pdf-lib'

/**
 * Gera um PDF de ficha D&D preenchida.
 * Tenta usar campos de formulário do template; se não existirem, desenha texto direto.
 */
export async function usePdf(charData, imageBase64 = null) {
  const url = '/templates/dnd_5.5_official.pdf'
  const existingPdfBytes = await fetch(url).then(r => r.arrayBuffer())
  const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true })

  try {
    const form = pdfDoc.getForm()
    fillFormFields(form, charData)
  } catch {
    // PDF sem formulário — desenha texto direto na página
    drawTextFallback(pdfDoc, charData)
  }

  if (imageBase64) {
    await embedCharacterImage(pdfDoc, imageBase64)
  }

  const pdfBytes = await pdfDoc.save()
  downloadBlob(pdfBytes, `${charData.name || 'character'}.pdf`)
}

function fillFormFields(form, c) {
  const set = (field, val) => {
    try { form.getTextField(field).setText(String(val ?? '')) } catch { /* campo não existe */ }
  }
  set('CharacterName', c.name)
  set('ClassLevel', `${c.class} ${c.level}`)
  set('Race', c.race)
  set('Background', c.background)
  set('Alignment', c.alignment)
  set('HPMax', c.hp)
  set('AC', c.ac)
  set('Speed', c.speed)
  set('ProfBonus', c.proficiencyBonus)

  for (const [key, ab] of Object.entries(c.abilities)) {
    set(`${key.toUpperCase()}score`, ab.score)
    set(`${key.toUpperCase()}mod`, ab.display)
  }
}

function drawTextFallback(pdfDoc, c) {
  const page = pdfDoc.getPages()[0]
  const { height } = page.getSize()
  page.drawText(`${c.name} — ${c.class} Lv${c.level}`, { x: 50, y: height - 50, size: 16 })
  page.drawText(`Race: ${c.race} | Background: ${c.background}`, { x: 50, y: height - 75, size: 10 })
}

async function embedCharacterImage(pdfDoc, base64) {
  const isPng = base64.startsWith('data:image/png') || base64.includes('iVBOR')
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
  const bytes = Uint8Array.from(atob(cleanBase64), ch => ch.charCodeAt(0))
  const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
  const page = pdfDoc.getPages()[0]
  page.drawImage(image, { x: 435, y: 610, width: 130, height: 160 })
}

function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}
