import WebPush from 'web-push'
import { FastifyInstance } from "fastify"
import { z } from 'zod'

const publicKey = 'BPVw1uVqbGuvwqbX2IgUD05s4QgwvNraY-l6Q2C7fE3HMX0vqb2DvpNyurpyyeIS-I4jzb3XqXkbMiRx8fivJ_g'
const privateKey = 'f0MOeT74YA-mqfXAs2S1_erUiaBHHCAxpit3xdA90i4'

WebPush.setVapidDetails('http://localhost:3333', publicKey, privateKey)

export async function notificationRoutes(app: FastifyInstance){
    app.get('/push/public_key', () => {
        return {
            publicKey,
        }
    })

    app.post('/push/register', (request, reply) => {
        console.log(request.body)

        return reply.status(201).send()
    })

    app.post('/push/send', async (request, reply) => {
        console.log(request.body)

        const sendPushBody = z.object({
            subscription: z.object({
                endpoint: z.string(),
                keys: z.object ({
                    p256dh: z.string(),
                    auth: z.string()
                })
            })
        })
        const { subscription } = sendPushBody.parse(request.body)

        setTimeout(() => {
            WebPush.sendNotification(subscription, "HELLO DO BACKEND")
        }, 5000)

        return reply.status(201).send()
    })
}