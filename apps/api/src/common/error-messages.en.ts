/**
 * English for the error messages the API sends to clients (AGENTS.md rule 4).
 *
 * Services keep throwing the Thai message, which stays the source text and
 * the key here; `ApiExceptionFilter` swaps it when the request asks for
 * English (`X-Locale: en` from the admin, or `Accept-Language`). That keeps
 * the ~350 throw sites unchanged and makes a missing entry fall back to Thai
 * rather than to an empty string. `error-messages.spec.ts` fails when a Thai
 * message thrown in the source has no entry.
 *
 * Messages built from values use numbered holes: `{1}`, `{2}` … match the
 * values in order, in both languages.
 */
export const ERROR_EN: Readonly<Record<string, string>> = {
  // ------------------------------------------------------- filter / defaults
  ข้อมูลที่ส่งมาไม่ถูกต้อง: 'The data sent is not valid',
  'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง':
    'Something went wrong on our side. Please try again.',
  กรุณาเข้าสู่ระบบก่อนใช้งาน: 'Please sign in first',
  คุณไม่มีสิทธิ์ทำรายการนี้: 'You do not have permission to do this',
  ไม่พบข้อมูลที่ต้องการ: 'Not found',
  'ทำรายการถี่เกินไป กรุณารอสักครู่': 'Too many requests. Please wait a moment.',

  // -------------------------------------------------------------- apps / packs
  'App นี้ติดตั้งไว้แล้ว': 'This app is already installed',
  'App นี้ถูกปิดอยู่': 'This app is turned off',
  'App นี้ยังไม่ได้ติดตั้ง': 'This app is not installed',
  'App นี้ไม่ได้รับสิทธิ์สำหรับคำสั่งนี้': 'This app is not allowed to run this command',
  'App เรียกคำสั่งที่ไม่รองรับ': 'The app called a command that is not supported',
  'key ต้องเป็น a-z, 0-9 และขีดกลาง': 'The key may only use a-z, 0-9 and hyphens',
  'manifest ตอบกลับการเปลี่ยนที่อยู่ที่ไม่สมบูรณ์': 'The manifest returned an incomplete redirect',
  'manifest ต้องอยู่บนโฮสต์สาธารณะ': 'The manifest must be on a public host',
  'manifest เปลี่ยนที่อยู่หลายครั้งเกินไป': 'The manifest redirected too many times',
  'manifest ใหญ่เกินไป': 'The manifest is too large',
  'version ต้องเป็น semver': 'The version must be semver',
  'webhook ต้องอยู่บนโฮสต์สาธารณะ': 'The webhook must be on a public host',
  'ขณะนี้ระบบปิดการติดตั้ง App ชั่วคราว กรุณาลองใหม่ภายหลัง':
    'Installing apps is paused right now. Please try again later.',
  'ขณะนี้ระบบปิดการติดตั้งแพ็กชั่วคราว กรุณาลองใหม่ภายหลัง':
    'Installing packs is paused right now. Please try again later.',
  'ขณะนี้ระบบปิดการใช้งาน App ชั่วคราว': 'Apps are paused right now',
  ข้อมูลแพ็กที่บันทึกไว้เสียหาย: 'The saved pack data is damaged',
  'ชื่อ key นี้ใช้กับ App ของระบบ กรุณาตั้งชื่อใหม่':
    'This key is used by a built-in app. Please choose another.',
  'ชื่อ key นี้ใช้กับแพ็กของระบบ กรุณาตั้งชื่อใหม่':
    'This key is used by a built-in pack. Please choose another.',
  'ชื่อแพ็กใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง': 'The pack name may only use a-z, 0-9 and hyphens',
  'ระบบยังไม่เปิดรับ App จากภายนอก': 'Third-party apps are not enabled',
  'เลขเวอร์ชันต้องอยู่ในรูป 1.2.3': 'The version must look like 1.2.3',
  'แพ็กนี้ต้องใช้ Lumio เวอร์ชัน {1} ขึ้นไป (เวอร์ชันนี้ {2})':
    'This pack needs Lumio {1} or later (this is {2})',
  'โหลด manifest ไม่สำเร็จ (สถานะ {1})': 'Could not load the manifest (status {1})',
  'โหลด manifest ไม่สำเร็จ กรุณาตรวจที่อยู่แล้วลองใหม่':
    'Could not load the manifest. Check the address and try again.',
  'ไฟล์ manifest ไม่ใช่ JSON ที่ถูกต้อง': 'The manifest is not valid JSON',
  'หาโฮสต์ของ manifest ไม่พบ': 'The manifest host could not be found',
  'ไม่พบ App นี้ในคลัง': 'This app is not in the catalogue',
  ไม่พบแพ็กนี้ในคลัง: 'This pack is not in the catalogue',
  ไม่พบแพ็กนี้ในเว็บของคุณ: 'This pack is not on your site',
  ยังไม่มีเทมเพลตในระบบ: 'There are no templates yet',
  ไม่พบเทมเพลตนี้: 'Template not found',
  ไม่พบเทมเพลตส่วนนี้: 'Section template not found',

  // ------------------------------------------------------------------ stripe
  'Stripe ตอบกลับไม่ครบ ลองอีกครั้ง': 'Stripe sent an incomplete answer. Please try again.',
  'Stripe สร้างส่วนลดไม่สำเร็จ ลองอีกครั้ง':
    'Stripe could not create the discount. Please try again.',
  'Stripe สร้างหน้าชำระเงินไม่สำเร็จ ลองอีกครั้ง':
    'Stripe could not create the payment page. Please try again.',
  คำขอไม่ผ่านการตรวจสอบจาก: 'The request failed verification',
  'คำขอไม่ผ่านการตรวจสอบจาก Stripe': 'Stripe could not verify the request',
  'ติดต่อ Stripe ไม่ได้ กรุณาลองอีกครั้ง': 'Could not reach Stripe. Please try again.',
  'ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง': 'Could not reach Stripe. Please try again.',
  'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY':
    'Stripe is not connected. Set STRIPE_SECRET_KEY.',
  'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนจัดการการต่ออายุ':
    'Stripe is not connected. Set STRIPE_SECRET_KEY before managing renewals.',
  'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนรับชำระเงิน':
    'Stripe is not connected. Set STRIPE_SECRET_KEY before taking payments.',
  'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนรับเงินจากผู้ซื้อ':
    'Stripe is not connected. Set STRIPE_SECRET_KEY before taking money from buyers.',
  'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนเปิดรับบัตร':
    'Stripe is not connected. Set STRIPE_SECRET_KEY before accepting cards.',
  'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนใช้งาน':
    'Stripe is not connected. Set STRIPE_SECRET_KEY first.',
  'ยังไม่ได้ตั้งค่า STRIPE_WEBHOOK_SECRET จึงตรวจสอบการชำระเงินไม่ได้':
    'STRIPE_WEBHOOK_SECRET is not set, so payments cannot be verified',
  'ลายเซ็นจาก Stripe หมดอายุ': 'The Stripe signature has expired',
  'ลายเซ็นจาก Stripe ไม่ครบถ้วน': 'The Stripe signature is incomplete',
  'ลายเซ็นจาก Stripe ไม่ถูกต้อง': 'The Stripe signature is not valid',
  'ร้านนี้ยังไม่ได้เชื่อมบัตรกับ Stripe จึงคืนเงินผ่านระบบไม่ได้':
    'This shop has not connected cards to Stripe, so it cannot refund through the system',
  'อ่านสถานะบัญชีรับเงินไม่สำเร็จ ลองอีกครั้ง':
    'Could not read the payout account status. Please try again.',
  'ยกเลิกการต่ออายุไม่สำเร็จ ลองอีกครั้ง': 'Could not cancel the renewal. Please try again.',
  'ยกเลิกแพ็กเกจเดิมไม่สำเร็จ กรุณาติดต่อฝ่ายสนับสนุน':
    'Could not cancel the previous plan. Please contact support.',
  'คืนเงินผ่านบัตรไม่สำเร็จ: {1}': 'The card refund failed: {1}',

  // ------------------------------------------------------------ bangkok bank
  'Client Secret ต้องยาวอย่างน้อย 8 ตัวอักษร': 'The Client Secret must be at least 8 characters',
  'Webhook Secret ต้องยาวอย่างน้อย 8 ตัวอักษร': 'The Webhook Secret must be at least 8 characters',
  'กรอก Client ID และ Client Secret ของธนาคารกรุงเทพก่อนผูกบัญชีรับเงิน':
    'Enter the Bangkok Bank Client ID and Client Secret before linking the payout account',
  'ข้อมูลเชื่อมต่อธนาคารถูกบันทึกไม่ถูกต้อง กรุณากรอก Client Secret ใหม่อีกครั้ง':
    'The bank connection was saved incorrectly. Please enter the Client Secret again.',
  'ข้อมูลเชื่อมต่อธนาคารเสียหาย กรุณากรอก Client Secret ใหม่อีกครั้ง':
    'The bank connection data is damaged. Please enter the Client Secret again.',
  คำขอไม่ผ่านการตรวจสอบจากธนาคาร: 'The bank could not verify the request',
  'ติดต่อ API ธนาคารกรุงเทพไม่ได้ ลองอีกครั้ง':
    'Could not reach the Bangkok Bank API. Please try again.',
  'ติดต่อ Payment Gateway ของธนาคารกรุงเทพไม่ได้ ลองอีกครั้ง':
    'Could not reach the Bangkok Bank payment gateway. Please try again.',
  'ถอดรหัสข้อมูลเชื่อมต่อธนาคารไม่สำเร็จ กรุณากรอก Client Secret ใหม่อีกครั้ง':
    'Could not decrypt the bank connection. Please enter the Client Secret again.',
  'ที่อยู่ API ของธนาคารต้องขึ้นต้นด้วย https://': 'The bank API address must start with https://',
  'ธนาคารกรุงเทพตอบกลับไม่ครบ ลองอีกครั้ง':
    'Bangkok Bank sent an incomplete answer. Please try again.',
  'ธนาคารกรุงเทพสร้างหน้าชำระเงินไม่สำเร็จ ลองอีกครั้ง':
    'Bangkok Bank could not create the payment page. Please try again.',
  'ธนาคารกรุงเทพไม่สามารถดึงรายการโอนได้ ลองอีกครั้ง':
    'Bangkok Bank could not fetch the transfers. Please try again.',
  'ธนาคารกรุงเทพไม่อนุมัติการเชื่อมต่อ กรุณาตรวจสอบ Client ID และ Secret':
    'Bangkok Bank refused the connection. Please check the Client ID and Secret.',
  'ยังไม่ได้ตั้งค่ากุญแจเข้ารหัสของระบบ (SECRETS_ENCRYPTION_KEY) จึงบันทึกข้อมูลเชื่อมต่อธนาคารไม่ได้':
    'The system encryption key (SECRETS_ENCRYPTION_KEY) is not set, so the bank connection cannot be saved',
  ยังไม่ได้ผูกบัญชีธนาคารกรุงเทพของร้านนี้: 'This shop has not linked a Bangkok Bank account',
  ลายเซ็นจากธนาคารหมดอายุ: 'The bank signature has expired',
  ลายเซ็นจากธนาคารไม่ครบถ้วน: 'The bank signature is incomplete',
  ลายเซ็นจากธนาคารไม่ถูกต้อง: 'The bank signature is not valid',
  'เลขบัญชีธนาคารกรุงเทพต้องเป็นตัวเลข 10 หลัก':
    'The Bangkok Bank account number must be 10 digits',
  'ร้านนี้ยังไม่ได้กรอก Client ID และ Client Secret ของธนาคารกรุงเทพ':
    'This shop has not entered its Bangkok Bank Client ID and Client Secret',
  'ร้านนี้ยังไม่ได้กรอกข้อมูล Payment Gateway ของธนาคารกรุงเทพ':
    'This shop has not entered its Bangkok Bank payment gateway details',
  'ร้านนี้ยังไม่ได้ตั้งค่า Webhook Secret ของธนาคารกรุงเทพ จึงยืนยันการชำระเงินไม่ได้':
    'This shop has not set its Bangkok Bank Webhook Secret, so payments cannot be confirmed',

  // ---------------------------------------------------------- shop / orders
  กรุณากรอกจังหวัด: 'Please enter the province',
  กรุณากรอกชื่อ: 'Please enter a name',
  กรุณากรอกชื่อผู้รับ: 'Please enter the recipient’s name',
  กรุณากรอกชื่อสินค้า: 'Please enter the product name',
  กรุณากรอกชื่อตัวเลือก: 'Please enter the option name',
  กรุณากรอกที่อยู่: 'Please enter the address',
  กรุณากรอกเบอร์โทรหรืออีเมลที่ใช้สั่งซื้อ: 'Please enter the phone or email used for the order',
  'กรุณาเลือกตัวเลือกของ "{1}"': 'Please choose an option for "{1}"',
  'คำสั่งซื้อนี้ยังไม่ได้ชำระเงิน จึงคืนเงินไม่ได้':
    'This order is not paid, so it cannot be refunded',
  คำสั่งซื้อนี้ไม่ได้ชำระผ่านพร้อมเพย์: 'This order was not paid with PromptPay',
  คำสั่งซื้อนี้ไม่ได้รอชำระเงินแล้ว: 'This order is no longer awaiting payment',
  'ตะกร้ามีสินค้าได้สูงสุด 50 รายการ': 'The cart can hold at most 50 items',
  ตะกร้ายังว่างอยู่: 'The cart is empty',
  ตัวเลือกต้องมีอย่างน้อยหนึ่งค่า: 'An option needs at least one value',
  'ตัวเลือกสินค้าถูกเปลี่ยนแล้ว กรุณาเลือกใหม่':
    'The product options changed. Please choose again.',
  'มีคนอื่นกำลังคืนเงินคำสั่งซื้อนี้อยู่ กรุณาโหลดใหม่อีกครั้ง':
    'Someone else is refunding this order. Please reload.',
  ยอดคืนเงินมากกว่ายอดที่ยังไม่ได้คืน: 'The refund is more than the amount left to refund',
  ยอดชำระต้องมากกว่าศูนย์: 'The amount must be more than zero',
  ยอดโอนให้ผู้ขายต้องมากกว่าศูนย์: 'The payout to the seller must be more than zero',
  ยังไม่มีสลิปของคำสั่งซื้อนี้: 'This order has no slip yet',
  'ระบบจัดเก็บสลิปยังไม่พร้อม ลองอีกครั้ง': 'Slip storage is not ready. Please try again.',
  ราคาก่อนลดต้องมากกว่าราคาขาย: 'The price before discount must be higher than the price',
  ราคาสูงเกินไป: 'The price is too high',
  ร้านค้านี้ยังไม่เปิดให้เข้าชม: 'This shop is not open yet',
  ร้านนี้ยังไม่เปิดรับชำระด้วยวิธีที่เลือก:
    'This shop does not accept the payment method you chose',
  'ร้านนี้ยังไม่เปิดรับชำระผ่านธนาคารกรุงเทพ กรุณาเลือกวิธีอื่น':
    'This shop does not accept Bangkok Bank payments. Please choose another method.',
  'ร้านนี้ยังไม่เปิดรับบัตร กรุณาเลือกพร้อมเพย์หรือเก็บเงินปลายทาง':
    'This shop does not accept cards. Please choose PromptPay or cash on delivery.',
  'ร้านนี้ยังไม่เปิดรับบัตร กรุณาเลือกวิธีอื่น':
    'This shop does not accept cards. Please choose another method.',
  ร้านนี้ไม่ได้เปิดรับชำระด้วยพร้อมเพย์: 'This shop does not accept PromptPay',
  'ร้านยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาติดต่อร้านค้า':
    'The shop has not set up PromptPay. Please contact the shop.',
  'สลิปต้องเป็นรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 4MB':
    'The slip must be a JPG, PNG or WebP image up to 4 MB',
  'สลิปนี้เคยส่งเข้ามาแล้ว กรุณาตรวจสอบอีกครั้ง': 'This slip was already sent. Please check again.',
  'สินค้า "{1}" มีไม่พอ': 'Not enough stock for "{1}"',
  สินค้าบางรายการไม่พร้อมขายแล้ว: 'Some items are no longer available',
  'สินค้าบางรายการไม่พร้อมขายแล้ว กรุณาตรวจตะกร้าอีกครั้ง':
    'Some items are no longer available. Please check your cart.',
  'เลขคำสั่งซื้อต้องอยู่ในรูปแบบ LM-261022-7K4Q': 'The order number must look like LM-261022-7K4Q',
  'เลขอ้างอิงสลิปต้องเป็นตัวอักษรหรือตัวเลข 4-60 ตัว':
    'The slip reference must be 4-60 letters or digits',
  'เว็บนี้ยังไม่เปิดรับชำระเงินออนไลน์ กรุณาติดต่อผู้ดูแลเว็บ':
    'This site does not take online payments yet. Please contact the site owner.',
  'ใช้ปุ่ม “คืนเงินลูกค้า” เพื่อคืนเงินพร้อมบันทึกยอด':
    'Use “Refund customer” to refund and record the amount',
  'ใส่รูปได้สูงสุด {1} รูป': 'You can add up to {1} images',
  ไม่พบคำสั่งซื้อที่ตรงกับเลขคำสั่งซื้อและข้อมูลติดต่อนี้:
    'No order matches that order number and contact',
  ไม่พบคำสั่งซื้อนี้: 'Order not found',
  ไม่พบสินค้านี้: 'Product not found',
  'ไม่สามารถค้นหาคำสั่งซื้อได้ กรุณาลองใหม่': 'Could not look up the order. Please try again.',
  'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่': 'Could not create the order. Please try again.',
  'พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก':
    'PromptPay must be a 10-digit phone number or a 13-digit ID number',
  'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก': 'The postcode must be 5 digits',
  'เบอร์โทรต้องเป็นตัวเลข 9-10 หลักและเริ่มด้วย 0':
    'The phone number must be 9-10 digits starting with 0',
  ไม่พบโปรโมชั่นนี้: 'Promotion not found',
  ไม่พบโปรโมชั่นนี้ในถังขยะ: 'This promotion is not in the trash',
  'ไม่พบฟอนต์สำหรับใบเสร็จ (assets/fonts/NotoSansThai.ttf)':
    'The receipt font is missing (assets/fonts/NotoSansThai.ttf)',

  // ------------------------------------------------------------------ booking
  กรุณาตั้งชื่อบริการ: 'Please name the service',
  กรุณาให้เบอร์โทรหรืออีเมลเพื่อติดต่อกลับ: 'Please give a phone number or email so we can reply',
  'เลยเวลานัดแล้ว กรุณาติดต่อร้านโดยตรง':
    'The appointment time has passed. Please contact the shop directly.',
  'เวลานี้มีคนจองแล้ว กรุณาเลือกเวลาอื่น':
    'Someone already booked this time. Please choose another.',
  'เวลานี้ใกล้เกินไป กรุณาเลือกเวลาอื่น': 'This time is too soon. Please choose another.',
  เวลานี้ไม่อยู่ในตารางเปิดให้บริการ: 'This time is outside opening hours',
  'เวลาปิดต้องอยู่ในรูป HH:MM': 'The closing time must be HH:MM',
  'เวลาเปิดต้องอยู่ในรูป HH:MM': 'The opening time must be HH:MM',
  เวลาไม่ถูกต้อง: 'The time is not valid',
  วันที่ไม่ถูกต้อง: 'The date is not valid',
  เว็บนี้ยังไม่เปิดรับการจอง: 'This site does not take bookings yet',
  เปลี่ยนสถานะนี้ไม่ได้ในขั้นตอนปัจจุบัน: 'This status cannot be changed at this stage',
  ไม่พบบริการนี้: 'Service not found',
  ไม่พบบริการนี้ในถังขยะ: 'This service is not in the trash',
  ไม่พบรายการจองนี้: 'Booking not found',

  // ---------------------------------------------------------------- members
  การเป็นสมาชิกนี้สิ้นสุดแล้ว: 'This membership has ended',
  กรุณาตั้งชื่อแพ็กเกจ: 'Please name the plan',
  คุณไม่ได้เป็นสมาชิกของเว็บนี้: 'You are not a member of this site',
  ผู้ใช้นี้เป็นสมาชิกของเว็บอยู่แล้ว: 'This user is already a member of the site',
  'สมัครไม่สำเร็จ กรุณาลองอีกครั้ง': 'Sign-up failed. Please try again.',
  'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ': 'This email already has an account. Please sign in.',
  'แพ็กเกจนี้มีสมาชิกอยู่ กรุณาหยุดขายชั่วคราวแทนการลบ เพื่อไม่ให้สมาชิกเสียสิทธิ์':
    'This plan has members. Pause sales instead of deleting it so members keep their access.',
  ไม่พบการเป็นสมาชิกนี้: 'Membership not found',
  ไม่พบผู้ติดตามนี้: 'Subscriber not found',
  'ไม่พบผู้ใช้ที่ใช้อีเมลนี้ กรุณาให้เขาสมัครสมาชิกก่อน':
    'No user has this email. Ask them to sign up first.',
  ไม่พบสมาชิกคนนี้ในเว็บ: 'This member is not on the site',
  ไม่พบแพ็กเกจนี้: 'Plan not found',
  ไม่พบแพ็กเกจนี้ในถังขยะ: 'This plan is not in the trash',
  ลิงก์ตั้งรหัสผ่านหมดอายุหรือไม่ถูกต้อง: 'The password reset link has expired or is not valid',
  ลิงก์ยืนยันอีเมลหมดอายุหรือไม่ถูกต้อง: 'The email verification link has expired or is not valid',
  'ไม่สามารถลบเจ้าของเว็บได้ กรุณาโอนความเป็นเจ้าของก่อน':
    'The site owner cannot be removed. Transfer ownership first.',
  ไม่สามารถเปลี่ยนบทบาทของเจ้าของเว็บได้: 'The site owner’s role cannot be changed',
  เว็บหนึ่งมีเจ้าของได้เพียงคนเดียว: 'A site can have only one owner',

  // -------------------------------------------------------------------- auth
  กรุณากรอกรหัสผ่าน: 'Please enter a password',
  'บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ในอีก 15 นาที':
    'The account is locked. Please try again in 15 minutes.',
  บัญชีนี้ยังไม่ได้เปิดใช้การยืนยันตัวตน: 'This account has not turned on verification',
  บัญชีนี้ยังไม่ได้เปิดใช้การยืนยันตัวตนสองขั้น:
    'This account has not turned on two-step verification',
  บัญชีนี้เปิดใช้การยืนยันตัวตนอยู่แล้ว: 'This account already has verification turned on',
  'ยังไม่ได้เริ่มตั้งค่าการยืนยันตัวตน กรุณากดเริ่มตั้งค่าก่อน':
    'Verification setup has not started. Please start the setup first.',
  'รหัสจากแอปยืนยันตัวตนต้องมี 6 หลัก': 'The authenticator code must be 6 digits',
  'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร': 'The password must be at least 8 characters',
  รหัสผ่านยาวเกินไป: 'The password is too long',
  รหัสผ่านไม่ถูกต้อง: 'The password is wrong',
  'รหัสยืนยันหมดอายุ กรุณาเข้าสู่ระบบใหม่':
    'The verification code has expired. Please sign in again.',
  รหัสเว็บไม่ถูกต้อง: 'The site ID is not valid',
  รหัสไม่ถูกต้อง: 'The code is wrong',
  'รหัสไม่ถูกต้อง ลองอีกครั้ง': 'The code is wrong. Please try again.',
  อีเมลนี้ถูกใช้งานแล้ว: 'This email is already in use',
  อีเมลหรือรหัสผ่านไม่ถูกต้อง: 'The email or password is wrong',
  อีเมลไม่ถูกต้อง: 'The email is not valid',
  อีเมลยาวเกินไป: 'The email is too long',
  เซสชันนี้ไม่ใช่ของเว็บนี้: 'This session is not for this site',
  'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่': 'Your session expired. Please sign in again.',
  'ไม่พบเซสชัน กรุณาเข้าสู่ระบบใหม่': 'No session found. Please sign in again.',
  ไม่พบผู้ใช้: 'User not found',
  ไม่พบผู้ใช้ของเซสชันนี้: 'The user for this session was not found',
  'ต้องระบุเว็บที่ต้องการใช้งาน (X-Site-Id)': 'Choose the site to work on (X-Site-Id)',
  คำขอมาจากโดเมนที่ไม่อนุญาต: 'The request came from a domain that is not allowed',
  คำขอไม่ถูกต้อง: 'The request is not valid',
  กุญแจนี้ไม่มีสิทธิ์อ่านเนื้อหา: 'This key cannot read content',
  กรุณาตั้งชื่อกุญแจ: 'Please name the key',
  ไม่พบกุญแจนี้: 'Key not found',
  เลือกอย่างน้อยหนึ่งสิทธิ์: 'Choose at least one permission',
  ลิงก์ตัวอย่างหมดอายุหรือไม่ถูกต้อง: 'The preview link has expired or is not valid',
  'ยังไม่ได้ตั้งค่า PREVIEW_SECRET (อย่างน้อย 16 ตัวอักษร) จึงสร้างลิงก์ตัวอย่างไม่ได้':
    'PREVIEW_SECRET (at least 16 characters) is not set, so preview links cannot be created',
  'ยังไม่ได้ตั้งค่า READER_SECRET หรือ JWT_ACCESS_SECRET (อย่างน้อย 16 ตัวอักษร)':
    'READER_SECRET or JWT_ACCESS_SECRET (at least 16 characters) is not set',

  // --------------------------------------------------------------- settings
  'subdomain ต้องเป็น a-z, 0-9 และขีดกลาง': 'The subdomain may only use a-z, 0-9 and hyphens',
  'subdomain นี้ถูกใช้งานแล้ว': 'This subdomain is taken',
  กรอกที่อยู่ปลายทางด้วย: 'Enter the destination address',
  กรอกที่อยู่เซิร์ฟเวอร์อีเมลด้วย: 'Enter the mail server address',
  กรอกที่อยู่เดิมด้วย: 'Enter the old address',
  กรอกอีเมลผู้ส่งด้วย: 'Enter the sender email',
  'กรอกเฉพาะชื่อเซิร์ฟเวอร์ ไม่ต้องมี https://': 'Enter only the server name, without https://',
  'กรุณากำหนดความลับสำหรับลงชื่อ (secret) อย่างน้อย 16 ตัวอักษร ก่อนเปิดใช้ webhook':
    'Set a signing secret of at least 16 characters before turning on the webhook',
  'การเปลี่ยนแบรนด์ของระบบต้องมีไลเซนส์ที่รวมความสามารถ white-label':
    'Rebranding the system needs a licence that includes white-label',
  ข้อมูลลับว่างไม่ได้: 'The secret cannot be empty',
  'ความลับสำหรับลงชื่อ (secret) ต้องยาวอย่างน้อย 16 ตัวอักษร':
    'The signing secret must be at least 16 characters',
  คีย์ยาวเกินไป: 'The key is too long',
  ชื่อผู้ส่งมีอักขระที่ใช้ไม่ได้: 'The sender name has characters that are not allowed',
  ชื่อผู้ส่งยาวเกินไป: 'The sender name is too long',
  ชื่อผู้ใช้มีอักขระที่ใช้ไม่ได้: 'The username has characters that are not allowed',
  ต้องระบุที่อยู่เดิมที่จะลบ: 'Give the old address to delete',
  'ที่อยู่ webhook ต้องขึ้นต้นด้วย https://': 'The webhook address must start with https://',
  'ที่อยู่ต้องขึ้นต้นด้วย https://': 'The address must start with https://',
  'ที่อยู่ต้องเป็นเซิร์ฟเวอร์บนอินเทอร์เน็ต ไม่ใช่เครือข่ายภายใน':
    'The address must be a server on the internet, not a private network',
  ที่อยู่นี้เป็นที่อยู่ฟรีของเว็บคุณอยู่แล้ว: 'This is already your site’s free address',
  ที่อยู่ปลายทางต้องต่างจากที่อยู่เดิม: 'The destination must differ from the old address',
  ที่อยู่ยาวเกินไป: 'The address is too long',
  ที่อยู่เซิร์ฟเวอร์อีเมลไม่ถูกต้อง: 'The mail server address is not valid',
  'ที่อยู่โดเมนต้องเป็นรูปเว็บ เช่น yourbrand.com': 'The domain must look like yourbrand.com',
  มีที่อยู่เดิมนี้เปลี่ยนเส้นทางอยู่แล้ว: 'This old address already redirects',
  'ลิงก์นี้ไม่ปลอดภัย กรุณาใช้ที่อยู่เว็บปกติ':
    'This link is not safe. Please use a normal web address.',
  ส่งหน้าแรกไปที่อื่นไม่ได้: 'The home page cannot be redirected',
  'ส่วน “{1}” ต้องมีไลเซนส์ที่ครอบคลุมส่วนนี้ก่อน จึงจะเปิดได้':
    '“{1}” needs a licence that covers it before it can be turned on',
  'ส่วน “{1}” ถูกปิดโดยผู้ดูแลระบบ จึงเปิดเองไม่ได้':
    '“{1}” was turned off by the system administrator and cannot be turned on here',
  'ส่วน “{1}” ปิดอยู่สำหรับเว็บนี้ — เปิดได้ที่ ตั้งค่า › ส่วนเสริม':
    '“{1}” is off for this site — turn it on in Settings › Add-ons',
  'สีต้องอยู่ในรูป #RRGGBB': 'The colour must be #RRGGBB',
  'สีต้องอยู่ในรูป #rrggbb': 'The colour must be #rrggbb',
  อีเมลทดสอบไม่ถูกต้อง: 'The test email is not valid',
  อีเมลนี้อยู่ในรายการแล้ว: 'This email is already on the list',
  อีเมลผู้รับไม่ถูกต้อง: 'The recipient email is not valid',
  อีเมลผู้ส่งไม่ถูกต้อง: 'The sender email is not valid',
  'เซิร์ฟเวอร์อีเมลต้องเป็นที่อยู่บนอินเทอร์เน็ต ไม่ใช่เครือข่ายภายใน':
    'The mail server must be on the internet, not a private network',
  'เว็บนี้ยังไม่ได้เปิดใช้ภาษานี้ เพิ่มได้ที่ตั้งค่า › ภาษา':
    'This site has not turned on this language. Add it in Settings › Languages.',
  'ใส่ได้ไม่เกิน 5 อีเมล': 'You can add up to 5 emails',
  โดเมนนี้ถูกใช้งานแล้ว: 'This domain is already in use',
  โดเมนนี้ยังไม่ผ่านการยืนยัน: 'This domain is not verified yet',
  ไม่พบการเปลี่ยนเส้นทางนี้: 'Redirect not found',
  ไม่พบโดเมนนี้: 'Domain not found',
  ไม่พบที่อยู่สาธารณะของเว็บนี้: 'This site has no public address',
  ไม่พบเว็บนี้: 'Site not found',
  ไม่พบเว็บไซต์นี้: 'Website not found',
  การแจ้งเตือนไม่ได้ระบุเว็บที่ต้องการ: 'The notification does not name a site',
  เนื้อหาการแจ้งเตือนอ่านไม่ได้: 'The notification body could not be read',
  'เนื้อหา webhook อ่านไม่ได้': 'The webhook body could not be read',
  'เนื้อหา webhook ไม่ครบถ้วน': 'The webhook body is incomplete',
  'ระบบยังไม่ได้เปิดรับสถิติจาก edge': 'Edge analytics are not enabled',
  'โทเคนของ edge ไม่ถูกต้อง': 'The edge token is not valid',

  // ----------------------------------------------------------------- billing
  เว็บนี้ใช้แพ็กเกจนี้อยู่แล้ว: 'This site is already on this plan',
  'เว็บนี้ไม่มีการต่ออายุอัตโนมัติ (พร้อมเพย์ชำระครั้งเดียว) จึงไม่ต้องยกเลิก':
    'This site does not renew automatically (PromptPay is a one-off payment), so there is nothing to cancel',
  'แพ็กเกจนี้ต้องชำระเงินก่อน ใช้ปุ่มชำระเงินในหน้านี้':
    'This plan needs payment first. Use the pay button on this page.',
  แพ็กเกจนี้ต้องติดต่อฝ่ายขาย: 'Contact sales for this plan',
  'แพ็กเกจฟรีไม่ต้องชำระเงิน เลือกแพ็กเกจนี้ได้เลย':
    'The free plan needs no payment. Just choose it.',

  // ---------------------------------------------------------- content / forms
  กรุณากรอกชื่อช่อง: 'Please name the field',
  กรุณาตั้งชื่อฟอร์ม: 'Please name the form',
  ข้อมูลในฟอร์มยังไม่ถูกต้อง: 'The form data is not valid yet',
  'ชื่อฟิลด์ใช้ได้เฉพาะ a-z, 0-9 และ _ (เริ่มด้วยตัวอักษร)':
    'Field names may only use a-z, 0-9 and _ (starting with a letter)',
  ชื่อลิงก์ต้องเป็นตัวพิมพ์เล็กและคั่นด้วยขีดกลาง:
    'The slug must be lowercase words separated by hyphens',
  ชื่อลิงก์นี้ถูกใช้แล้ว: 'This slug is taken',
  ต้องมีอย่างน้อยหนึ่งส่วน: 'Add at least one section',
  ฟอร์มต้องมีอย่างน้อยหนึ่งช่อง: 'A form needs at least one field',
  ฟอร์มนี้เป็นภาษานี้อยู่แล้ว: 'This form is already in this language',
  'ฟอร์มหนึ่งมีได้ไม่เกิน {1} ช่อง': 'A form can have at most {1} fields',
  มีคนอื่นแก้หน้านี้ไปแล้ว: 'Someone else has already edited this page',
  มีฟอร์มภาษานี้อยู่แล้ว: 'A form in this language already exists',
  หน้านี้เป็นภาษานี้อยู่แล้ว: 'This page is already in this language',
  'หน้านี้เป็นภาษาหลักอยู่แล้ว ไม่ต้องแปล':
    'This page is in the main language already; no translation needed',
  หน้านี้ไม่ได้อยู่ในถังขยะ: 'This page is not in the trash',
  ไม่พบข้อความนี้: 'Message not found',
  ไม่พบฟอร์มนี้: 'Form not found',
  ไม่พบฟอร์มนี้ในถังขยะ: 'This form is not in the trash',
  ไม่พบหน้านี้: 'Page not found',
  ไม่พบเนื้อหานี้: 'Content not found',
  ไม่พบเวอร์ชันนี้: 'Version not found',

  // ------------------------------------------------------------------- media
  ชนิดไฟล์ในไฟล์สำรองไม่ตรงกับข้อมูล: 'A file type in the backup does not match its data',
  ชนิดไฟล์ไม่ตรงกับที่แจ้งไว้: 'The file type does not match what was declared',
  มีรูปซ้ำอยู่ในรายการที่เลือก: 'The selection has the same image twice',
  'ยังไม่พบไฟล์ที่อัปโหลด กรุณาลองอัปโหลดอีกครั้ง':
    'The uploaded file was not found. Please upload again.',
  รอรูปโหลดเสร็จก่อนแล้วค่อยครอป: 'Wait for the image to finish loading before cropping',
  รูป: 'Image',
  'รูป GIF เคลื่อนไหวครอปไม่ได้': 'Animated GIFs cannot be cropped',
  รูปที่เลือกมีคำอธิบายครบแล้ว: 'The selected images already have descriptions',
  รูปที่เลือกไม่ถูกต้อง: 'The selected image is not valid',
  'รูปนี้ยังเตรียมไม่เสร็จ รอสักครู่แล้วลองอีกครั้ง':
    'This image is still being prepared. Wait a moment and try again.',
  รูปบางรูปไม่พบในคลังรูปของเว็บนี้: 'Some images are not in this site’s library',
  'รูปใหญ่เกินไป ลองใช้รูปไม่เกิน 15MB': 'The image is too large. Use one up to 15 MB.',
  'ลิงก์อัปโหลดหมดอายุแล้ว กรุณาเริ่มอัปโหลดใหม่':
    'The upload link expired. Please start the upload again.',
  'สแกนไฟล์ไม่สำเร็จ ลองอัปโหลดใหม่อีกครั้ง': 'The file scan failed. Please upload again.',
  'สแกนไฟล์ไม่สำเร็จ: clamd ตอบกลับ "{1}"': 'The file scan failed: clamd answered "{1}"',
  'สแกนไฟล์ไม่สำเร็จ: clamd ปิดการเชื่อมต่อ': 'The file scan failed: clamd closed the connection',
  'สแกนไฟล์ไม่สำเร็จ: clamd ไม่ตอบภายในเวลาที่กำหนด':
    'The file scan failed: clamd did not answer in time',
  อ่านขนาดรูปไม่สำเร็จ: 'Could not read the image size',
  'อ่านสีจากรูปนี้ไม่ได้ ลองใช้รูปอื่นหรือเลือกสีเอง':
    'Could not read colours from this image. Try another image or pick colours yourself.',
  'ไฟล์นี้ตรวจพบไวรัส จึงไม่ถูกบันทึก': 'A virus was found in this file, so it was not saved',
  ไฟล์นี้ไม่ใช่รูปภาพที่ระบบรองรับ: 'This file is not a supported image',
  ไฟล์นี้ไม่ใช่รูปแบบที่ระบบรองรับ: 'This file type is not supported',
  ไฟล์สำรองมีชนิดไฟล์ที่ไม่รองรับ: 'The backup has a file type that is not supported',
  ไฟล์สำรองว่างเปล่า: 'The backup file is empty',
  ไฟล์สำรองใหญ่มากเกินกว่าจะกู้คืนได้: 'The backup is too large to restore',
  'ไฟล์ใหญ่กว่าที่แจ้งไว้ กรุณาลองใหม่': 'The file is larger than declared. Please try again.',
  ไฟล์ใหญ่เกินกำหนด: 'The file is too large',
  ไม่พบข้อมูลไฟล์ที่ส่งมา: 'No file data was sent',
  ไม่พบรูปที่เลือก: 'The selected image was not found',
  ไม่พบรูปที่เลือกในคลังสื่อ: 'The selected image is not in the media library',
  ไม่พบรูปนี้: 'Image not found',
  'ไม่พบรูปบางรายการ หรือรูปถูกลบไปแล้ว': 'Some images were not found or were deleted',
  ไม่พบรูปภาพที่เลือก: 'The selected image was not found',
  ไม่พบไฟล์รูปนี้: 'The image file was not found',
  ไม่พบไฟล์สำรองนี้: 'Backup not found',

  // ---------------------------------------------------------------------- ai
  บอกผู้ช่วยสักหน่อยว่าอยากปรับอะไร: 'Tell the assistant what you would like to change',
  'ผู้ช่วย AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองอีกครั้ง':
    'The AI assistant answered in a format we could not read. Please try again.',
  'ผู้ช่วย AI ตอบกลับไม่สำเร็จ ลองอีกครั้ง': 'The AI assistant could not answer. Please try again.',
  'ผู้ช่วย AI ตอบจำนวนข้อความไม่ตรงกับที่ขอ ลองอีกครั้ง':
    'The AI assistant returned a different number of texts than asked. Please try again.',
  'ผู้ช่วย AI ไม่ได้ส่งคำตอบกลับมา ลองอีกครั้ง':
    'The AI assistant did not answer. Please try again.',
  'ผู้ช่วย AI ไม่ได้ส่งคำอธิบายรูปกลับมา ลองอีกครั้ง':
    'The AI assistant did not return image descriptions. Please try again.',
  'ผู้ช่วย AI ไม่ได้ส่งชื่อเรื่องและคำอธิบายกลับมา ลองอีกครั้ง':
    'The AI assistant did not return a title and description. Please try again.',
  'ผู้ช่วยยังไม่ได้ปรับอะไรใหม่ ลองสั่งให้ชัดขึ้นอีกนิด':
    'The assistant did not change anything. Try a clearer instruction.',
  'ผู้ช่วยยังไม่ได้ปรับอะไรใหม่ ลองเลือกแบบอื่นดูนะ':
    'The assistant did not change anything. Try another option.',
  'ผู้ให้บริการ AI ปฏิเสธคำขอ ลองอีกครั้ง':
    'The AI provider refused the request. Please try again.',
  'ติดต่อผู้ให้บริการ AI ไม่ได้ ลองอีกครั้ง': 'Could not reach the AI provider. Please try again.',
  'งานนี้ต้องใช้ผู้ให้บริการ AI กรุณาตั้งค่า AI_PROVIDER=openai และ AI_API_KEY ก่อนใช้งาน':
    'This needs an AI provider. Set AI_PROVIDER=openai and AI_API_KEY first.',
  'การแปลเป็น{1}ต้องใช้ผู้ให้บริการ AI กรุณาตั้งค่า AI_PROVIDER=openai และ AI_API_KEY ก่อน':
    'Translating into {1} needs an AI provider. Set AI_PROVIDER=openai and AI_API_KEY first.',
  'ยังแปลเป็นภาษานี้ไม่ได้ (รองรับ {1})': 'This language cannot be translated yet (supported: {1})',
  'ยังไม่ได้ตั้งค่า AI_API_KEY กรุณาตั้งค่าแล้วลองอีกครั้ง':
    'AI_API_KEY is not set. Set it and try again.',
  'เดือนนี้ใช้ผู้ช่วย AI ครบ {1} ครั้งแล้ว รอเดือนใหม่หรืออัปเกรดแพ็กเกจ':
    'You have used the AI assistant {1} times this month. Wait for next month or upgrade your plan.',
  'แพ็กเกจนี้ยังไม่รวมผู้ช่วย AI กรุณาอัปเกรดแพ็กเกจเพื่อใช้งาน':
    'This plan does not include the AI assistant. Upgrade your plan to use it.',
  'โควตาผู้ช่วย AI เหลือ {1} ครั้ง แต่ต้องใช้ {2} ครั้ง ลองเลือกน้อยลง':
    'You have {1} AI uses left but this needs {2}. Try choosing fewer.',
  เล่าให้ฟังสักหน่อยว่าเว็บนี้ทำอะไร: 'Tell us a little about what this site does',
  // ------------------------------------------------- start-up configuration
  'ต้องตั้งค่า REDIS_URL ก่อนใช้ QUEUE_DRIVER=bullmq':
    'Set REDIS_URL before using QUEUE_DRIVER=bullmq',
  'ต้องตั้งค่า MEDIA_UPLOAD_SECRET ก่อนรันในโหมด production':
    'Set MEDIA_UPLOAD_SECRET before running in production',
  'ตั้งค่า S3 ไม่ครบ ต้องระบุ {1} ก่อนใช้ MEDIA_STORAGE=s3':
    'The S3 settings are incomplete: set {1} before using MEDIA_STORAGE=s3',
  'ไม่พบโฟลเดอร์ templates (ลองแล้ว: {1}) — ตั้งค่า TEMPLATES_DIR ได้':
    'The templates folder was not found (tried: {1}) — set TEMPLATES_DIR',
  'อ่านไฟล์ {1} ไม่ได้: {2}': 'Could not read {1}: {2}',
  'ไฟล์ {1} ไม่ถูกต้อง: {2}': '{1} is not valid: {2}',
  'ไม่พบโฟลเดอร์ {1}': 'Folder {1} was not found',
  'ไม่พบโฟลเดอร์เทมเพลต {1}': 'Template folder {1} was not found',
  'เทมเพลต {1} ต้องมีหน้าตัวอย่างอย่างน้อย 4 หน้า (พบ {2})':
    'Template {1} needs at least 4 sample pages (found {2})',
  'ไม่พบภาพตัวอย่างของเทมเพลต {1}: {2}': 'The preview image of template {1} was not found: {2}',
};
