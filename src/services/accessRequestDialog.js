const CONTACT_URL = 'https://itsjeevanvarghese.web.app/contact'

let activeDialog = null

function showDialog(appName, message, allowRequest) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.setAttribute('aria-label', `${appName} access request`)
    dialog.style.cssText = 'border:0;border-radius:18px;padding:0;max-width:440px;width:calc(100% - 32px);box-shadow:0 24px 80px rgba(15,23,42,.28);font-family:system-ui,sans-serif;color:#0f172a'
    dialog.innerHTML = `<div style="padding:24px"><h2 style="margin:0 0 10px;font-size:21px">Application access required</h2><p style="margin:0 0 20px;line-height:1.55;color:#475569">${message}</p><div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap"><a href="${CONTACT_URL}" target="_blank" rel="noopener noreferrer" style="padding:10px 14px;color:#2563eb;text-decoration:none;font-weight:600">Contact developer</a><button data-close style="padding:10px 14px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer">${allowRequest ? 'Not now' : 'Close'}</button>${allowRequest ? '<button data-request style="padding:10px 14px;border:0;border-radius:10px;background:#2563eb;color:white;font-weight:700;cursor:pointer">Send access request</button>' : ''}</div></div>`
    document.body.appendChild(dialog)
    dialog.addEventListener('close', () => { const accepted = dialog.returnValue === 'request'; dialog.remove(); resolve(accepted) }, { once: true })
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close('close'))
    dialog.querySelector('[data-request]')?.addEventListener('click', () => dialog.close('request'))
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); dialog.close('close') })
    dialog.showModal()
  })
}

export function offerAccessRequest({ appName, requestStatus, sendRequest }) {
  if (activeDialog) return activeDialog
  activeDialog = (async () => {
    if (requestStatus === 'pending') return showDialog(appName, 'Your access request is awaiting administrator approval. You can check again later or contact the developer.', false)
    if (requestStatus === 'rejected') return showDialog(appName, 'Your access request was not approved. Contact the developer if you need the decision reviewed.', false)
    if (requestStatus === 'approved') return showDialog(appName, 'Access was approved, but the account or application is currently inactive. Contact the developer for help.', false)
    const accepted = await showDialog(appName, `Your account is not approved for ${appName}. Would you like to send an access request to the administrator?`, true)
    if (!accepted) return
    const result = await sendRequest()
    const status = result?.status
    const message = status === 'rejected' ? 'Your earlier request was rejected. Contact the developer if you need the decision reviewed.' : status === 'approved' || status === 'already-approved' ? 'Your access is approved. Close this message and sign in again.' : 'Access request sent. It is now visible in Firebase Access Manager under Pending Requests.'
    await showDialog(appName, message, false)
  })().finally(() => { activeDialog = null })
  return activeDialog
}
