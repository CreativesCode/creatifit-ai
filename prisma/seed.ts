import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Crear ejercicios básicos
  const exercises = [
    { name: 'Push-ups', kind: 'push', meta: { category: 'bodyweight', muscle: 'chest' } },
    { name: 'Pull-ups', kind: 'pull', meta: { category: 'bodyweight', muscle: 'back' } },
    { name: 'Squats', kind: 'squat', meta: { category: 'bodyweight', muscle: 'legs' } },
    { name: 'Deadlifts', kind: 'hinge', meta: { category: 'compound', muscle: 'posterior' } },
    { name: 'Plank', kind: 'core', meta: { category: 'bodyweight', muscle: 'core' } },
    { name: 'Burpees', kind: 'cardio', meta: { category: 'bodyweight', muscle: 'full' } },
    { name: 'Band Rows', kind: 'pull', meta: { category: 'resistance', muscle: 'back' } },
    { name: 'Band Push-ups', kind: 'push', meta: { category: 'resistance', muscle: 'chest' } },
    { name: 'Lunges', kind: 'squat', meta: { category: 'bodyweight', muscle: 'legs' } },
    { name: 'Mountain Climbers', kind: 'cardio', meta: { category: 'bodyweight', muscle: 'core' } },
  ]

  for (const exercise of exercises) {
    await prisma.exercises.upsert({
      where: { name: exercise.name },
      update: {},
      create: exercise,
    })
  }

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
