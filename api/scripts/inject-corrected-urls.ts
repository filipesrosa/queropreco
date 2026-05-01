import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const correctedUrls = [
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260452511591001560656030000001501119149935|2|1|1|BD5FB49EEFD0E612628A40937972EF64AB03DBB1',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260452511591001560656030000001511119149932|2|1|1|390B0F8565F4CD8EC1C8B3EAC296498284B0FAD1',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260452511591001560656030000001561119149939|2|1|1|93CAF651CC9D8B5C368CE17E33C468CE5E526021',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260266158742000662650010000317161533029315|2|1|1|BA61E9ECD291F1B7175231B2E11BEF53D2E50956',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260452511591001560656030000006671119149930|2|1|1|DDB477CDBE318B66A2D5E9E12B4CEB9044DED26A',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260415685374000327650010000233051940159472|2|1|1|0DECB1D35B5F17497479A502E5A9462000567C7F',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260452511591001560656030000006831119149933|2|1|1|80517F19B5A1AB6A401F8DFC268B74D4D41CF246',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260466158742000662650010000351151749608513|2|1|1|09B104BCCD63076E6AEB4EDFD3834AC6963932E0',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260452511591001560656030000000539119149937|2|1|14|15.48|6f63573874364b5972375a6454374b44736b774e62655675694c6f3d|1|EBFEF82458F479ACCACE23CA753E8ECDA8F9BEBA',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260466158742000662650010000351001027175007|2|1|1|039B57A189C0DF3AD9873E7DC677DE7204D30460',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260405364327000409653010000284981000491204|2|1|1|bb91dfa9cc8611c1b4e70c011ee5fa840c6e1575',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260413140477000114650010000329981532740795|2|1|1|A7094165DFE8D0D8DF0AFB5937448C1447586C80',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260414571140000124650010000079111000791115|2|1|1|5161D12191BDD3126A16C3377F0E75F5DE680756',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260414571140000124650010000078441000784416|2|1|1|C9C28B34B52E2D549909058C0041F831793E5CF7',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260414571140000124650010000078761000787605|2|1|1|F14AF2F1CDF6BEF063C0AA6774E73E4F9C994ABB',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260439341518000205650010000278001275372335|2|1|1|623B1C9242C2F492E7BD96C4E7931842F47036FB',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260461898805000199650020000027181000033072|2|1|1|7B1C146C109C1E93C2E23C281E62EB02BC98B826',
  'https://www.nfce.fazenda.sp.gov.br/qrcode?p=35260413140477000114650010000330141403964552|2|1|1|499687F77D29BBF58EA475EBE328D098FD435899',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260440299482000147650020000038551621888220|2|1|1|A9E3AD9EEF0728ECEC1CC194066EF6A672C6322E',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260440299482000147650020000038581787056153|2|1|1|991A7061936479A1697EC94020A8A31095CFD893',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260440299482000147650020000038611119618570|2|1|1|7A02F5B4D60653350ADE12B9CFC2FCC5C1CB6789',
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=35260440299482000147650020000037861640102296|2|1|1|C37D160AD5A0DA88FC2BEFE5CE2BF6E3C9EF4102',
]

function extractAccessKey(url: string): string | null {
  try {
    const p = new URL(url).searchParams.get('p')
    if (!p) return null
    const ak = p.split('|')[0].replace(/\D/g, '')
    return ak.length === 44 ? ak : null
  } catch { return null }
}

async function main() {
  const year = String(new Date().getFullYear()).slice(-2)
  const keyRegex = new RegExp(`(?<!\\d)(35${year}\\d{40})(?!\\d)`)

  const pendingRecords = await prisma.randomValue.findMany({
    where: { processedAt: null },
  })
  const invalidRecords = pendingRecords.filter(r => !keyRegex.test(r.value))

  console.log(`Pending: ${pendingRecords.length} total, ${invalidRecords.length} invalid`)

  let updated = 0
  let inserted = 0
  const usedIds = new Set<string>()

  for (const url of correctedUrls) {
    const ak = extractAccessKey(url)
    if (!ak) {
      console.log(`SKIP  — could not extract key from URL`)
      continue
    }

    // Match by CNPJ (14 digits at positions 6-19) and invoice number (9 digits at 25-33)
    // Either substring appearing in the malformed value is enough to identify a match
    const cnpjPart = ak.substring(6, 20)
    const invoicePart = ak.substring(25, 34)

    const match = invalidRecords.find(r =>
      !usedIds.has(r.id) && (r.value.includes(cnpjPart) || r.value.includes(invoicePart))
    )

    if (match) {
      await prisma.randomValue.update({
        where: { id: match.id },
        data: { value: url, processedAt: null },
      })
      usedIds.add(match.id)
      console.log(`UPD   [${match.id}] ak=...${ak.slice(-8)}`)
      updated++
    } else {
      const created = await prisma.randomValue.create({ data: { value: url } })
      console.log(`INS   [${created.id}] ak=...${ak.slice(-8)}`)
      inserted++
    }
  }

  console.log(`\nDone: ${updated} updated, ${inserted} inserted`)
}

main().finally(() => prisma.$disconnect())
