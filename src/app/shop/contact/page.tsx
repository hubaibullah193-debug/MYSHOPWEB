'use client'

import { whatsappLink } from '@/lib/business-config'

export default function ContactPage() {
  const contactLink = whatsappLink('Asalaam-o-Alaikum, I have a question about your shop.')

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h1>
        <p className="text-gray-600 leading-relaxed">
          Hubaib One Stop Shop — Your Goals, Your Game, Your Words. For order updates, product
          inquiries, bulk requests, or returns and refunds support, reach us through the channels
          below and we&apos;ll get back to you as soon as we can.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Shop Location</h2>
          <p className="text-gray-700 leading-relaxed">
            Pandiali, Danishkool Road Adda Bazar
            <br />
            District Mohmand, KPK, Pakistan
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Opening Hours</h2>
          <p className="text-gray-700 leading-relaxed">
            Monday – Sunday
            <br />
            7:00 AM – 8:00 PM
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">WhatsApp</h2>
          {contactLink ? (
            <>
              <p className="text-gray-700 mb-4">
                Message us anytime for order tracking, payment confirmation, or to arrange a return
                or refund. Please include your order ID so we can help faster.
              </p>
              <a
                href={contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition"
              >
                Chat on WhatsApp
              </a>
            </>
          ) : (
            <p className="text-gray-700">
              Chat with the shop via the WhatsApp button on your order confirmation, tracking, and
              checkout pages.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Returns &amp; Refunds</h2>
          <p className="text-gray-700 leading-relaxed">
            Items can be returned or refunded as per our returns policy. Start a return by messaging
            us on WhatsApp with your order ID and reason, and we&apos;ll confirm the next steps.
          </p>
        </div>
      </div>
    </div>
  )
}