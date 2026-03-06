// functions/webhook.js
// Cloudflare Edge Function for SePay Webhook

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const { content, amount, transferType, transactionDate } = body;

    console.log(`[SePay Log] ${content} - ${amount} - ${transferType}`);

    if (transferType !== 'IN') return new Response('Ignored', { status: 200 });

    // 1. Tìm mã NHAU (SePay gửi content)
    const match = content.match(/NHAU[A-Z0-9]+/i);
    if (!match) return new Response('No valid code found', { status: 200 });
    const paymentCode = match[0].toUpperCase();

    const projectId = "nhaujs";
    
    // 2. Tra cứu Mapping (Lấy UID, PollID)
    const mappingRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payment_mappings/${paymentCode}`);
    if (!mappingRes.ok) return new Response('Mapping not found', { status: 200 });

    const mappingData = await mappingRes.json();
    const pollId = mappingData.fields.pollId.stringValue;
    const userId = mappingData.fields.userId.stringValue;
    const prefix = mappingData.fields.prefix.stringValue || "";

    // 3. Cập nhật trạng thái 'isPaid' sang TRUE trong Poll
    const pollUpdateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${prefix}polls/${pollId}?updateMask.fieldPaths=bill.items.${userId}.isPaid&updateMask.fieldPaths=bill.items.${userId}.paidAmount&updateMask.fieldPaths=bill.items.${userId}.paidAt`;

    const updateBody = {
      fields: {
        bill: {
          mapValue: {
            fields: {
              items: {
                mapValue: {
                  fields: {
                    [userId]: {
                      mapValue: {
                        fields: {
                          isPaid: { booleanValue: true },
                          paidAmount: { integerValue: String(amount) },
                          paidAt: { integerValue: String(Date.now()) }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const writeRes = await fetch(pollUpdateUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateBody)
    });

    if (!writeRes.ok) {
        console.error("Firestore Write Failed:", await writeRes.text());
        return new Response('Update Database Failed', { status: 500 });
    }

    console.log(`[SePay Success] Updated Poll ${pollId} for User ${userId}`);
    return new Response(JSON.stringify({ success: true, paymentCode, userId }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Webhook Runtime Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
