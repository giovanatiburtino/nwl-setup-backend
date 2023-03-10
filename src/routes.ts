import dayjs from 'dayjs'
import { FastifyInstance } from "fastify"
import { z } from 'zod'
import { prisma } from "./lib/prisma"

export async function appRoutes(app: FastifyInstance){
    app.post('/habits', async (request) => {

        const createHabitBody = z.object({
            title: z.string(),
            weekDays: z.array(
                z.number().min(0).max(6)
            )
        })

        const { title, weekDays } = createHabitBody.parse(request.body)

        const today = dayjs().startOf("day").toDate()

        
        await prisma.habit.create({
            data: {
                title,
                created_at: today,
                weekDays: {
                    create: weekDays.map(weekDay => {
                        return {
                            week_day: weekDay
                        }
                    })
                }
            }
        })
    })

    app.get('/day', async (request) => {
        const getDayParams = z.object({
            date: z.coerce.date()
        })

        const { date } = getDayParams.parse(request.query)

        const parsedDate = dayjs(date).startOf('day')
        const weekDay = parsedDate.get('day')

        //todos hábitos possiveis
        // hábitos que já foram completados

        const possibleHabits = await prisma.habit.findMany({
            where: {
                created_at: {
                    lte: date,
                },
                weekDays: {
                    some: {
                        week_day: weekDay,
                    }
                }
            }
        })

        const day = await prisma.day.findUnique({
            where: {
                date: parsedDate.toDate(),
            },
            include: {
                dayHabits: true,
            }
        })

        const completedHabits = day?.dayHabits.map(dayHabit => {
            return dayHabit.habit_id
        }) ?? []
 
        return { possibleHabits, completedHabits }
    })

    app.patch('/habits/:id/toggle', async (request) => {
        const toggleHabitParams = z.object({
            id: z.string().uuid()
        })    

        const { id } = toggleHabitParams.parse(request.params)
        

        const today = dayjs().startOf("day").toDate()

        let day = await prisma.day.findUnique({
            where: {
                date: today,
            }
        })

        if(!day){
            day = await prisma.day.create({
                data: {
                    date: today
                }
            })
        }

        const dayHabit = await prisma.dayHabit.findUnique({
            where: {
                day_id_habit_id: {
                    day_id: day.id,
                    habit_id: id,
                }
            }
        })

        if(dayHabit){
            //remover a marcação de completo
            await prisma.dayHabit.delete({
                where: {
                    id: dayHabit.id
                }
            })
        } else { //completar o hábito
            await prisma.dayHabit.create({
                data: {
                    day_id: day.id,
                    habit_id: id
                }
            })
        }   
    })

    app.get('/summary', async () => {
        // retornar um array com vários objetos com três info: data, hábitos possiveis e quantos foram completados

        const summary = await prisma.$queryRaw`
            SELECT 
                D.id, 
                D.date,
                (
                SELECT 
                    count(*)::int4
                FROM day_habits DH
                WHERE DH.day_id = D.id
                ) as completed,
                (
                SELECT
                    count(*)::int4
                FROM habit_week_days HDW
                JOIN habits H
                    ON H.id = HDW.habit_id
                WHERE
                    HDW.week_day = (extract(isodow from D.date) - 1)
                    AND H.created_at <= D.date
                ) as amount
            FROM days D
        `

        return summary
    })
}