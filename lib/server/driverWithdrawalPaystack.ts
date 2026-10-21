import 'server-only'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'

function getTestPaystackKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY || ''

  if (!key.startsWith('sk_test_')) {
    throw new Error('Paystack TEST key required for driver payouts.')
  }

  return key
}

async function paystackRequest(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
  } = {}
) {
  const key = getTestPaystackKey()

  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    ...(options.body
      ? { body: JSON.stringify(options.body) }
      : {}),
    cache: 'no-store',
  })

  const result: unknown = await response.json().catch(() => null)

    if (
    !response.ok ||
    !result ||
    typeof result !== 'object' ||
    !('status' in result) ||
    result.status !== true
  ) {
    const errorCode =
      result &&
      typeof result === 'object' &&
      'code' in result &&
      typeof result.code === 'string'
        ? result.code.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60)
        : 'unknown'

    console.error('Paystack API request failed:', {
      operation: options.method || 'GET',
      endpoint: path.split('?')[0],
      httpStatus: response.status,
      errorCode,
    })

    throw new Error(
      `Paystack API error: HTTP ${response.status}, code ${errorCode}.`
    )
  }

  return result
}

export async function createTestTransferRecipient({
  accountName,
  accountNumber,
  bankCode,
}: {
  accountName: string
  accountNumber: string
  bankCode: string
}) {
  return paystackRequest('/transferrecipient', {
    method: 'POST',
    body: {
      type: 'nuban',
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    },
  })
}

export async function verifyTestTransfer(reference: string) {
  if (!/^FRWD-TEST-[a-f0-9]{32}$/.test(reference)) {
    throw new Error('Invalid Fountain Ride TEST transfer reference.')
  }

  return paystackRequest(
    `/transfer/verify/${encodeURIComponent(reference)}`
  )
}

export async function initiateTestDriverWithdrawalTransfer({
  reference,
  recipientCode,
  amountKobo,
}: {
  reference: string
  recipientCode: string
  amountKobo: number
}) {
  if (!/^FRWD-TEST-[a-f0-9]{32}$/.test(reference)) {
    throw new Error('Invalid TEST withdrawal reference.')
  }

  if (!/^RCP_[A-Za-z0-9]+$/.test(recipientCode)) {
    throw new Error('Invalid Paystack transfer recipient.')
  }

  if (
    !Number.isSafeInteger(amountKobo) ||
    amountKobo <= 0
  ) {
    throw new Error('Invalid transfer amount.')
  }

  return paystackRequest('/transfer', {
    method: 'POST',
    body: {
      source: 'balance',
      amount: amountKobo,
      recipient: recipientCode,
      reference,
      reason: 'Fountain Ride driver earnings withdrawal',
    },
  })
}

export function validateSuccessfulTestTransfer(
  response: unknown,
  expected: {
    reference: string
    recipientCode: string
    amountKobo: number
  }
): string {
  if (
    !response ||
    typeof response !== 'object' ||
    !('status' in response) ||
    response.status !== true ||
    !('data' in response) ||
    !response.data ||
    typeof response.data !== 'object'
  ) {
    throw new Error('Invalid Paystack verification response.')
  }

  const data = response.data as Record<string, unknown>

  if (data.status !== 'success') {
    throw new Error('Paystack transfer is not confirmed successful.')
  }

  if (data.reference !== expected.reference) {
    throw new Error('Paystack transfer reference mismatch.')
  }

  if (
    typeof data.amount !== 'number' ||
    data.amount !== expected.amountKobo
  ) {
    throw new Error('Paystack transfer amount mismatch.')
  }

  if (data.currency !== 'NGN') {
    throw new Error('Paystack transfer currency mismatch.')
  }

  const recipient = data.recipient

  const recipientCode =
    typeof recipient === 'string'
      ? recipient
      : recipient &&
          typeof recipient === 'object' &&
          'recipient_code' in recipient
        ? recipient.recipient_code
        : null

  if (recipientCode !== expected.recipientCode) {
    throw new Error('Paystack transfer recipient mismatch.')
  }

  if (
    typeof data.transfer_code !== 'string' ||
    !/^TRF_[A-Za-z0-9]+$/.test(data.transfer_code)
  ) {
    throw new Error('Missing or invalid Paystack transfer code.')
  }

  return data.transfer_code
}

export function validateFailedTestTransfer(
  response: unknown,
  expected: {
    reference: string
    recipientCode: string
    amountKobo: number
  }
): string {
  if (
    !response ||
    typeof response !== 'object' ||
    !('status' in response) ||
    response.status !== true ||
    !('data' in response) ||
    !response.data ||
    typeof response.data !== 'object'
  ) {
    throw new Error('Invalid Paystack failure verification response.')
  }

  const data = response.data as Record<string, unknown>

  if (data.status !== 'failed') {
    throw new Error('Paystack has not confirmed transfer failure.')
  }

  if (data.reference !== expected.reference) {
    throw new Error('Failed transfer reference mismatch.')
  }

  if (
    typeof data.amount !== 'number' ||
    data.amount !== expected.amountKobo
  ) {
    throw new Error('Failed transfer amount mismatch.')
  }

  if (data.currency !== 'NGN') {
    throw new Error('Failed transfer currency mismatch.')
  }

  const recipient = data.recipient

  const recipientCode =
    typeof recipient === 'string'
      ? recipient
      : recipient &&
          typeof recipient === 'object' &&
          'recipient_code' in recipient
        ? recipient.recipient_code
        : null

  if (recipientCode !== expected.recipientCode) {
    throw new Error('Failed transfer recipient mismatch.')
  }

  if (
    typeof data.transfer_code !== 'string' ||
    !/^TRF_[A-Za-z0-9]+$/.test(data.transfer_code)
  ) {
    throw new Error('Missing or invalid failed transfer code.')
  }

  return data.transfer_code
}

export async function verifyTestTransferRecipient(
  recipientCode: string,
  expected: {
    bankCode: string
    accountNumber: string
  }
): Promise<boolean> {
  if (!/^RCP_[A-Za-z0-9]+$/.test(recipientCode)) {
    throw new Error('Invalid Paystack recipient code.')
  }

  if (
    !expected.bankCode ||
    !/^[0-9]{10}$/.test(expected.accountNumber)
  ) {
    throw new Error('Invalid expected bank account details.')
  }

  const response = await paystackRequest(
    `/transferrecipient/${encodeURIComponent(recipientCode)}`
  )

  const data =
    response &&
    typeof response === 'object' &&
    'data' in response &&
    response.data &&
    typeof response.data === 'object'
      ? response.data as Record<string, unknown>
      : null

  const details =
    data?.details &&
    typeof data.details === 'object'
      ? data.details as Record<string, unknown>
      : null

  const actualRecipientCode = data?.recipient_code
  const actualBankCode = details?.bank_code
  const actualAccountNumber = details?.account_number

  if (
    actualRecipientCode !== recipientCode ||
    String(actualBankCode || '') !== expected.bankCode ||
    String(actualAccountNumber || '') !== expected.accountNumber
  ) {
    throw new Error(
      'Paystack recipient does not match the verified withdrawal account.'
    )
  }

  return true
}
