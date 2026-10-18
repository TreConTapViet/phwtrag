const TARGET = 'Lê Nguyễn Phương Trang'

// Only spacing and Unicode encoding are normalised: some Vietnamese keyboards
// (e.g. Unikey "Unicode tổ hợp") emit decomposed accents that look identical.
const tidy = (value) => value.normalize('NFC').replace(/\s+/g, ' ').trim()

// Loose form, used only to tell "right name, wrong accents/capitals" apart from a wrong name.
const loose = (value) =>
  tidy(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()

// 'ok'     → exactly "Lê Nguyễn Phương Trang" (accents + capitalised initials)
// 'format' → right name but missing accents or capitals
// 'wrong'  → someone else
export function checkName(value) {
  if (tidy(value) === TARGET) return 'ok'
  if (loose(value) === loose(TARGET)) return 'format'
  return 'wrong'
}
