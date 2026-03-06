// functions/webhook.js
// Cloudflare Edge Function for SePay Webhook

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const { content, amount, transferType, transactionDate } = body;

    console.log(`[SePay Log] ${content} - ${amount} - ${transferType}`);

    if (transferType !== 'IN') return new Response('Ignored', { status: 200 });

    // 1. Tìm mã định danh (Regex lấy chữ NHAU/NHAUJS kèm 3-10 ký tự chữ/số)
    const match = content.match(/NHAU(JS)?[A-Z0-9]{3,10}/i);
    if (!match) return new Response(`Ignored: No valid NHAUJS code in content "${content}"`, { status: 200 });
    const paymentCode = match[0].toUpperCase();

    const projectId = "nhaujs";
    
    // 2. Tra cứu Mapping (Lấy UID, PollID, Prefix)
    const mappingRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/payment_mappings/${paymentCode}`);
    if (!mappingRes.ok) return new Response(`Ignored: Payment code ${paymentCode} not mapped in database`, { status: 200 });

    const mappingData = await mappingRes.json();
    if (!mappingData.fields) return new Response('Invalid mapping data structure', { status: 200 });

    const pollId = mappingData.fields.pollId.stringValue;
    const userId = mappingData.fields.userId.stringValue;
    const prefix = mappingData.fields.prefix ? mappingData.fields.prefix.stringValue : "";

    // Poll Path (Đảm bảo prefix kết thúc bằng / nếu có, hoặc để trống)
    // Thực tế trong logic Save, prefix là 'ob_' hoặc 'du2_'
    const pollPath = `${prefix}polls/${pollId}`;

    // 3. Cập nhật trạng thái 'isPaid' sang TRUE trong Poll
    // Sử dụng query parameter `updateMask.fieldPaths` cho các trường nested
    const fieldIsPaid = `bill.items.${userId}.isPaid`;
    const fieldAmount = `bill.items.${userId}.paidAmount`;
    const fieldAt = `bill.items.${userId}.paidAt`;

    const pollUpdateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${pollPath}?updateMask.fieldPaths=${fieldIsPaid}&updateMask.fieldPaths=${fieldAmount}&updateMask.fieldPaths=${fieldAt}`;

    // Cấu trúc lồng nhau bắt buộc phải khớp với updateMask
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
        const errorText = await writeRes.text();
        console.error("Firestore Write Failed:", errorText);
        return new Response(`Update Database Failed: ${errorText}`, { status: 500 });
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
