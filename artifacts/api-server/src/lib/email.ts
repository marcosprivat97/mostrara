import { env } from "./env.js";

type EmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

export function hasResendConfig() {
  return Boolean(env.email.resendApiKey && env.email.resendFromEmail);
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraph(value: string) {
  return `<p style="margin:0 0 12px">${escapeHtml(value)}</p>`;
}

async function sendEmail(input: EmailInput) {
  if (!hasResendConfig()) {
    return { sent: false, skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.email.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.email.resendFromEmail,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Falha ao enviar e-mail");
  }

  return { sent: true, skipped: false };
}

export async function sendWelcomeEmail(params: {
  to: string;
  storeName: string;
  storeSlug: string;
  ownerName: string;
}) {
  const loginUrl = `${env.core.appUrl}/dashboard`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <div style="max-width:640px;margin:0 auto;padding:24px">
        <h1 style="margin:0 0 12px;font-size:24px">Bem-vindo a Mostrara</h1>
        ${paragraph(`Sua loja ${params.storeName} foi criada com sucesso.`)}
        ${paragraph(`A conta foi vinculada a ${params.ownerName}.`)}
        ${paragraph(`Link da loja: ${params.storeSlug}`)}
        <p style="margin:18px 0"><a href="${loginUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Acessar painel</a></p>
        <p style="margin:0;color:#6b7280;font-size:12px">Se voce nao reconhece essa criacao de conta, altere sua senha imediatamente.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Sua loja ${params.storeName} esta pronta`,
    html,
    text: `Sua loja ${params.storeName} foi criada com sucesso. Acesse o painel em ${loginUrl}.`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  storeName: string;
  resetUrl: string;
}) {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <div style="max-width:640px;margin:0 auto;padding:24px">
        <h1 style="margin:0 0 12px;font-size:24px">Recuperacao de senha</h1>
        ${paragraph(`Recebemos uma solicitacao para redefinir a senha da conta ${params.storeName}.`)}
        <p style="margin:18px 0"><a href="${params.resetUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Redefinir senha</a></p>
        <p style="margin:0;color:#6b7280;font-size:12px">Se voce nao solicitou isso, pode ignorar este e-mail.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Recuperacao de senha - ${params.storeName}`,
    html,
    text: `Recuperacao de senha para ${params.storeName}. Acesse: ${params.resetUrl}`,
  });
}

export async function sendPasswordChangedEmail(params: {
  to: string;
  storeName: string;
}) {
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <div style="max-width:640px;margin:0 auto;padding:24px">
        <h1 style="margin:0 0 12px;font-size:24px">Senha atualizada</h1>
        ${paragraph(`A senha da conta ${params.storeName} foi alterada com sucesso.`)}
        ${paragraph("Se nao foi voce, redefina a senha imediatamente.")} 
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Senha atualizada - ${params.storeName}`,
    html,
    text: `A senha da conta ${params.storeName} foi alterada com sucesso.`,
  });
}

export async function sendMerchantOrderEmail(params: {
  to: string;
  storeName: string;
  orderId: string;
  customerName: string;
  customerWhatsapp: string;
  total: number;
  paymentMethod: string;
  deliveryMethod: string;
  addressLines: string[];
  items: Array<{ name: string; quantity: number; price: number; selected_options?: { name: string; price: number }[] }>;
}) {
  const itemsHtml = params.items
    .map((item) => {
      const options = item.selected_options?.length
        ? `<div style="color:#6b7280;font-size:12px;margin-top:2px">+ ${item.selected_options.map((option) => `${escapeHtml(option.name)} (${money(option.price)})`).join(", ")}</div>`
        : "";
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
            <div style="font-weight:600;color:#111827">${escapeHtml(item.name)}</div>
            ${options}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;text-align:center">${item.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#374151;text-align:right">${money(item.price)}</td>
        </tr>
      `;
    })
    .join("");

  const addressBlock = params.addressLines.length
    ? `<div style="margin-top:12px;padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb">${params.addressLines.map((line) => `<div style="font-size:13px;color:#374151">${escapeHtml(line)}</div>`).join("")}</div>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <div style="max-width:720px;margin:0 auto;padding:24px">
        <h1 style="margin:0 0 12px;font-size:24px">Novo pedido - ${escapeHtml(params.storeName)}</h1>
        <p style="margin:0 0 8px"><strong>Pedido:</strong> ${escapeHtml(params.orderId)}</p>
        <p style="margin:0 0 8px"><strong>Cliente:</strong> ${escapeHtml(params.customerName)}</p>
        <p style="margin:0 0 8px"><strong>WhatsApp:</strong> ${escapeHtml(params.customerWhatsapp)}</p>
        <p style="margin:0 0 8px"><strong>Pagamento:</strong> ${escapeHtml(params.paymentMethod)}</p>
        <p style="margin:0 0 8px"><strong>Entrega:</strong> ${escapeHtml(params.deliveryMethod)}</p>
        ${addressBlock}
        <table style="width:100%;border-collapse:collapse;margin-top:18px">
          <thead>
            <tr>
              <th style="text-align:left;padding:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase">Item</th>
              <th style="text-align:center;padding:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase">Qtd</th>
              <th style="text-align:right;padding:0 0 8px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <p style="margin:18px 0 0;font-size:18px;font-weight:700">Total: ${money(params.total)}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Novo pedido - ${params.storeName}`,
    html,
    text: `Novo pedido ${params.orderId} para ${params.storeName}. Total ${money(params.total)}.`,
  });
}

export async function sendCustomerReceiptEmail(params: {
  to: string;
  storeName: string;
  orderId: string;
  total: number;
  paymentStatus: string;
  qrCode?: string;
  ticketUrl?: string;
}) {
  const qrBlock = params.qrCode
    ? `<div style="margin-top:14px;padding:12px;border-radius:12px;background:#f9fafb;border:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280;margin-bottom:6px">Copia e cola Pix</div><div style="word-break:break-all;font-family:monospace;font-size:12px;color:#111827">${escapeHtml(params.qrCode)}</div></div>`
    : "";
  const ticketBlock = params.ticketUrl
    ? `<p style="margin:14px 0 0"><a href="${params.ticketUrl}" style="color:#dc2626;font-weight:700;text-decoration:none">Abrir comprovante Pix</a></p>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <div style="max-width:720px;margin:0 auto;padding:24px">
        <h1 style="margin:0 0 12px;font-size:24px">Pagamento confirmado</h1>
        ${paragraph(`Seu pedido ${params.orderId} na ${params.storeName} foi atualizado.`)}
        ${paragraph(`Status do pagamento: ${params.paymentStatus}`)}
        ${paragraph(`Total: ${money(params.total)}`)}
        ${qrBlock}
        ${ticketBlock}
      </div>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Pagamento confirmado - ${params.storeName}`,
    html,
    text: `Seu pagamento foi confirmado para o pedido ${params.orderId}. Total ${money(params.total)}.`,
  });
}
