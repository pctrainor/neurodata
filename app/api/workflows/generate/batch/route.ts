import { NextRequest, NextResponse } from 'next/server'

/**
 * Universal Batch Agent Generation API
 * 
 * Generates agents in batches to avoid token limits.
 * Called repeatedly by the wizard to build up large agent counts.
 * 
 * NOW UNIVERSAL: Works with ANY agent type using dynamic naming and persona generation.
 * - Professional agents get titles (Dr., Prof., etc.)
 * - Fantasy agents get themed names (Zyx-7, Sir Galahad, etc.)
 * - Casual agents get diverse human names
 * - All agents get contextual behaviors based on task type
 */

// =============================================================================
// NAME POOLS
// =============================================================================

// Diverse human name pools for agent generation
const FIRST_NAMES = {
  western: ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William', 'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander', 'Abigail', 'Michael', 'Emily', 'Daniel', 'Elizabeth', 'Matthew', 'Sofia', 'David', 'Victoria', 'Joseph'],
  asian: ['Wei', 'Yuki', 'Hiroshi', 'Mei', 'Kenji', 'Sakura', 'Chen', 'Aiko', 'Jin', 'Hana', 'Ryu', 'Yuna', 'Tao', 'Sora', 'Min', 'Kaori', 'Jing', 'Akira', 'Ling', 'Haruto', 'Yuki', 'Takeshi', 'Naomi', 'Kazuki', 'Hikaru', 'Ren', 'Ayumi', 'Kenta', 'Mika', 'Shinji'],
  latino: ['Sofia', 'Mateo', 'Valentina', 'Santiago', 'Camila', 'Sebastian', 'Lucia', 'Diego', 'Mariana', 'Carlos', 'Isabella', 'Miguel', 'Gabriela', 'Alejandro', 'Elena', 'Andres', 'Paula', 'Juan', 'Ana', 'Luis', 'Carmen', 'Rafael', 'Rosa', 'Antonio', 'Maria', 'Fernando', 'Adriana', 'Ricardo', 'Patricia', 'Eduardo'],
  african: ['Amara', 'Kwame', 'Zara', 'Kofi', 'Nia', 'Jabari', 'Aisha', 'Malik', 'Imani', 'Darius', 'Aaliyah', 'Jamal', 'Kira', 'Marcus', 'Zuri', 'Xavier', 'Keisha', 'Andre', 'Fatima', 'Omar', 'Ayo', 'Chidi', 'Adaeze', 'Obinna', 'Chioma', 'Emeka', 'Adanna', 'Ngozi', 'Ikenna', 'Chiamaka'],
  indian: ['Priya', 'Arjun', 'Ananya', 'Rohan', 'Diya', 'Vikram', 'Neha', 'Aditya', 'Riya', 'Rahul', 'Kavya', 'Sanjay', 'Ishita', 'Amit', 'Pooja', 'Karan', 'Shreya', 'Dev', 'Anisha', 'Raj', 'Sunita', 'Vivek', 'Meera', 'Deepak', 'Sneha', 'Nikhil', 'Tara', 'Ashok', 'Lakshmi', 'Suresh'],
  middleEastern: ['Layla', 'Omar', 'Sara', 'Ahmed', 'Noor', 'Hassan', 'Fatima', 'Yusuf', 'Mariam', 'Ali', 'Leila', 'Karim', 'Zahra', 'Tariq', 'Hana', 'Faris', 'Amina', 'Samir', 'Yasmin', 'Khalid', 'Rania', 'Mustafa', 'Dina', 'Ibrahim', 'Salma', 'Rashid', 'Lina', 'Walid', 'Mona', 'Ziad'],
}

// Professional titles (weighted towards Dr.)
const PROFESSIONAL_TITLES = ['Dr.', 'Dr.', 'Dr.', 'Prof.', 'Dr.', 'PhD']

// Specializations for professional agents
const SPECIALIZATIONS = {
  scientist: ['Neuroscience', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Mathematics', 'Genetics', 'Astronomy', 'Ecology', 'Biochemistry', 'Materials Science', 'Quantum Physics', 'Microbiology', 'Oceanography', 'Climatology'],
  researcher: ['AI Research', 'Data Science', 'Cognitive Science', 'Social Psychology', 'Behavioral Economics', 'Epidemiology', 'Genomics', 'Robotics', 'Machine Learning', 'Computational Biology', 'Neurotechnology', 'Drug Discovery', 'Climate Modeling', 'Quantum Computing', 'Bioinformatics'],
  doctor: ['Cardiology', 'Neurology', 'Oncology', 'Pediatrics', 'Surgery', 'Internal Medicine', 'Psychiatry', 'Dermatology', 'Radiology', 'Anesthesiology', 'Emergency Medicine', 'Pathology', 'Geriatrics', 'Pulmonology', 'Gastroenterology'],
  lawyer: ['Corporate Law', 'Criminal Law', 'Intellectual Property', 'Environmental Law', 'Constitutional Law', 'Tax Law', 'Immigration Law', 'Family Law', 'Real Estate Law', 'Employment Law', 'International Law', 'Healthcare Law', 'Securities Law', 'Antitrust Law', 'Civil Rights Law'],
  engineer: ['Software Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aerospace Engineering', 'Biomedical Engineering', 'Environmental Engineering', 'Nuclear Engineering', 'Robotics Engineering', 'AI Engineering', 'Systems Engineering', 'Structural Engineering', 'Marine Engineering', 'Automotive Engineering'],
  analyst: ['Data Analytics', 'Financial Analysis', 'Market Research', 'Business Intelligence', 'Risk Analysis', 'Security Analysis', 'Policy Analysis', 'Systems Analysis', 'Behavioral Analytics', 'Competitive Intelligence', 'Performance Analytics', 'Predictive Modeling', 'Trend Analysis', 'Consumer Insights', 'Operational Analysis'],
  default: ['General Practice', 'Applied Research', 'Field Study', 'Theoretical Work', 'Experimental Design', 'Case Study', 'Comparative Analysis', 'Longitudinal Research', 'Cross-sectional Study', 'Meta-analysis', 'Qualitative Research', 'Quantitative Research', 'Mixed Methods', 'Action Research', 'Ethnography']
}

// Fantasy name pools by category
const FANTASY_NAMES = {
  alien: ['Zyx-7', 'Klatuu', 'Xorbian', 'Qwerty-9', 'Nexar', 'Theta-12', 'Zephyx', 'Kronax', 'Vex-88', 'Zillox', 'Proxima', 'Altair-6', 'Rigel-X', 'Vega-9', 'Sirius-7', 'Andromeda-3', 'Orion-12', 'Centauri-5', 'Polaris-8', 'Arcturus-2', 'Betelgeuse-4', 'Antares-11', 'Deneb-6', 'Capella-9', 'Aldebaran-3', 'Spica-7', 'Regulus-5', 'Fomalhaut-8', 'Castor-2', 'Pollux-4'],
  robot: ['Unit-742', 'R2-X9', 'ARIA-3', 'NEXUS-7', 'PROTO-12', 'ECHO-5', 'ZETA-8', 'OMEGA-1', 'DELTA-6', 'SIGMA-4', 'TAU-9', 'KAPPA-2', 'THETA-7', 'LAMBDA-3', 'MU-11', 'NU-8', 'XI-5', 'OMICRON-6', 'PI-4', 'RHO-9', 'BETA-12', 'GAMMA-7', 'ALPHA-3', 'EPSILON-8', 'ETA-2', 'IOTA-5', 'PHI-11', 'CHI-6', 'PSI-4', 'UPSILON-9'],
  medieval: ['Sir Galahad', 'Lady Morgana', 'Baron Blackwood', 'Dame Elara', 'Lord Thorncastle', 'Lady Seraphina', 'Sir Cedric', 'Countess Ravenna', 'Duke Alaric', 'Princess Isolde', 'Sir Gareth', 'Lady Rowena', 'Earl Godric', 'Baroness Lyanna', 'Sir Percival', 'Lady Guinevere', 'Lord Aldric', 'Dame Beatrix', 'Baron Oswald', 'Countess Cordelia', 'Sir Tristan', 'Lady Vivienne', 'Duke Fenwick', 'Princess Rosalind', 'Earl Magnus', 'Baroness Eloise', 'Lord Roderick', 'Dame Astrid', 'Baron Leopold', 'Countess Madeleine'],
  wizard: ['Zephyrus the Wise', 'Morgath Shadowcaster', 'Elindra Starweaver', 'Theron the Ancient', 'Seraphel Moonwhisper', 'Aldric Flameheart', 'Lunaria Crystalmind', 'Oberon Stormcaller', 'Celestia Nightveil', 'Malachar the Grey', 'Isadora Frostweave', 'Thandril Runekeeper', 'Avalon Mistwalker', 'Xander Spellbinder', 'Rowena Sunshadow', 'Merrick Thornwood', 'Sylvara Windchant', 'Balthazar Darkholm', 'Mirabel Lightbringer', 'Caelum Voidwatcher', 'Endora Earthshaper', 'Finnian Firespirit', 'Gwendolyn Dreamweaver', 'Hadrian Stoneheart', 'Ilyana Soulkeeper', 'Jareth Shadowmend', 'Kassandra Timekeeper', 'Lysander Worldwalker', 'Nephele Skyborn', 'Oriana Spiritcaller'],
  vampire: ['Count Dracul', 'Lady Nyx', 'Baron Sanguis', 'Countess Crimson', 'Lord Tenebris', 'Duchess Nocturne', 'Prince Vladislav', 'Lady Scarlet', 'Baron Nightshade', 'Countess Vesper', 'Duke Morbius', 'Lady Raven', 'Count Sanguine', 'Baroness Midnight', 'Lord Erebus', 'Lady Carmilla', 'Prince Lazarus', 'Countess Lilith', 'Baron Graves', 'Duchess Obsidian', 'Count Viktor', 'Lady Anastasia', 'Duke Constantine', 'Baroness Selene', 'Lord Damien', 'Countess Aurora', 'Prince Sebastian', 'Lady Valentina', 'Baron Mortimer', 'Duchess Ophelia'],
  pirate: ['Captain Blackbeard', 'Admiral Scarlet', 'First Mate Storm', 'Quartermaster Drake', 'Navigator Tide', 'Captain Redhand', 'Commodore Shadow', 'Captain Ironside', 'Admiral Tempest', 'First Mate Bones', 'Captain Cutlass', 'Navigator Compass', 'Quartermaster Gold', 'Captain Savage', 'Admiral Kraken', 'First Mate Silver', 'Captain Phantom', 'Navigator Star', 'Quartermaster Rum', 'Captain Viper', 'Admiral Thunder', 'First Mate Hook', 'Captain Marrow', 'Navigator Moon', 'Quartermaster Doubloon', 'Captain Reef', 'Admiral Corsair', 'First Mate Anchor', 'Captain Plunder', 'Navigator Wave'],
  ninja: ['Shadow Kaze', 'Silent Ryu', 'Phantom Hiro', 'Ghost Akira', 'Void Takeshi', 'Eclipse Yuki', 'Mist Kenji', 'Serpent Shinji', 'Storm Hayato', 'Blade Masashi', 'Smoke Tetsu', 'Night Kaito', 'Thunder Daichi', 'Ice Yukio', 'Fire Kazuma', 'Wind Haruki', 'Earth Sora', 'Water Minato', 'Lightning Raiden', 'Steel Goro', 'Shadow Sakura', 'Silent Ayame', 'Phantom Hanako', 'Ghost Yuna', 'Void Mei', 'Eclipse Hana', 'Mist Kiyomi', 'Serpent Mika', 'Storm Natsuki', 'Blade Rin'],
  superhero: ['Captain Valor', 'The Phantom', 'Crimson Guardian', 'Silver Shadow', 'Thunder Strike', 'Night Wing', 'Cosmic Ray', 'Steel Titan', 'Blaze Runner', 'Ice Queen', 'Storm Chaser', 'Mind Master', 'Power Surge', 'Gravity Force', 'Speed Demon', 'Shield Bearer', 'Fire Phoenix', 'Aqua Marine', 'Earth Shaker', 'Wind Walker', 'Light Bringer', 'Dark Knight', 'Star Lord', 'Moon Goddess', 'Sun Warrior', 'Time Keeper', 'Space Ranger', 'Dimension Hopper', 'Reality Bender', 'Fate Changer'],
  default: ['Entity Alpha', 'Spectre Beta', 'Wraith Gamma', 'Phantom Delta', 'Spirit Epsilon', 'Ghost Zeta', 'Shadow Eta', 'Shade Theta', 'Specter Iota', 'Revenant Kappa', 'Apparition Lambda', 'Vision Mu', 'Presence Nu', 'Essence Xi', 'Being Omicron', 'Form Pi', 'Shape Rho', 'Figure Sigma', 'Outline Tau', 'Silhouette Upsilon', 'Enigma Phi', 'Mystery Chi', 'Puzzle Psi', 'Riddle Omega', 'Paradox Alpha-2', 'Anomaly Beta-2', 'Phenomenon Gamma-2', 'Occurrence Delta-2', 'Event Epsilon-2', 'Instance Zeta-2']
}

// Demographics for persona generation
const DEMOGRAPHICS = {
  'gen-z': { label: 'Gen Z', ageRange: [13, 24], traits: ['digital native', 'values authenticity', 'short attention span', 'meme-literate', 'social media savvy', 'climate conscious', 'diverse perspectives', 'entrepreneurial mindset'] },
  'millennial': { label: 'Millennial', ageRange: [25, 40], traits: ['tech savvy', 'experience-focused', 'work-life balance', 'socially conscious', 'collaborative', 'adaptable', 'purpose-driven', 'health conscious'] },
  'gen-x': { label: 'Gen X', ageRange: [41, 56], traits: ['independent', 'skeptical', 'values quality', 'pragmatic', 'resourceful', 'balanced', 'self-reliant', 'straightforward'] },
  'boomer': { label: 'Boomer', ageRange: [57, 75], traits: ['brand loyal', 'detail oriented', 'traditional values', 'patient', 'hardworking', 'competitive', 'team-oriented', 'optimistic'] },
  'senior': { label: 'Senior', ageRange: [75, 95], traits: ['health conscious', 'family focused', 'wisdom seeker', 'routine-oriented', 'value experience', 'patient', 'deliberate', 'traditional'] },
}

// Personality types for diversity
const PERSONALITY_TYPES = ['analytical', 'creative', 'social', 'driver', 'amiable', 'expressive', 'skeptical', 'enthusiastic', 'methodical', 'intuitive']

// Occupation-specific traits
const OCCUPATION_TRAITS: Record<string, string[][]> = {
  chef: [
    ['classically trained', 'innovative', 'perfectionist', 'flavor-obsessed'],
    ['comfort food lover', 'experimental', 'presentation-focused', 'seasonal ingredients advocate'],
    ['fusion enthusiast', 'traditionalist', 'spice lover', 'health-conscious cook'],
    ['pastry specialist', 'grill master', 'sauce expert', 'farm-to-table advocate']
  ],
  teacher: [
    ['patient', 'encouraging', 'strict but fair', 'innovative pedagogy'],
    ['student-centered', 'lecture-style', 'hands-on learner advocate', 'technology integrator'],
    ['nurturing', 'challenging', 'supportive', 'assessment-focused'],
    ['collaborative', 'independent study advocate', 'project-based', 'differentiated instruction']
  ],
  critic: [
    ['harsh but fair', 'encouraging', 'detail-oriented', 'big-picture focused'],
    ['traditionalist', 'avant-garde appreciator', 'populist', 'elitist'],
    ['verbose', 'concise', 'analytical', 'emotional responder'],
    ['constructive', 'blunt', 'diplomatic', 'provocative']
  ],
  student: [
    ['diligent', 'perfectionist', 'anxious about grades', 'thorough'],
    ['balanced', 'occasionally distracted', 'decent effort', 'social learner'],
    ['unconventional answers', 'artistic', 'sometimes off-topic', 'imaginative'],
    ['needs extra time', 'guesses often', 'distracted', 'uncertain']
  ],
  default: [
    ['analytical', 'thorough', 'detail-oriented', 'systematic'],
    ['creative', 'innovative', 'outside-the-box thinker', 'visionary'],
    ['practical', 'results-oriented', 'efficient', 'pragmatic'],
    ['collaborative', 'team player', 'communicative', 'supportive']
  ]
}

// =============================================================================
// TYPES
// =============================================================================

interface BatchRequest {
  batchNumber: number
  batchSize: number
  totalCount: number
  agentNoun: string
  agentNounPlural: string
  namingStyle: 'professional' | 'casual' | 'fantasy' | 'numbered'
  taskType: 'rating' | 'reaction' | 'analysis' | 'testing' | 'creation' | 'voting' | 'debate' | 'custom'
  taskVerb: string
  taskContext: string
  demographicMix?: string[]
}

interface GeneratedAgent {
  type: string
  label: string
  payload: {
    label: string
    agentNoun: string
    persona: {
      name: string
      displayName: string
      culturalBackground: string
      ageGroup: string
      age: number
      personality: string
      traits: string[]
      specialization?: string
      title?: string
    }
    behavior: string
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a human name with cultural diversity
 */
function generateHumanName(index: number): { firstName: string; culturalBackground: string } {
  const backgrounds = Object.keys(FIRST_NAMES) as (keyof typeof FIRST_NAMES)[]
  const background = backgrounds[index % backgrounds.length]
  const names = FIRST_NAMES[background]
  const firstName = names[Math.floor((index / backgrounds.length) % names.length)]
  return { firstName, culturalBackground: background }
}

/**
 * Get fantasy name based on agent noun category
 */
function getFantasyName(agentNoun: string, index: number): string {
  const lowerNoun = agentNoun.toLowerCase()
  
  // Find matching category
  for (const [category, names] of Object.entries(FANTASY_NAMES)) {
    if (lowerNoun.includes(category)) {
      return names[index % names.length]
    }
  }
  
  // Check for related terms
  if (lowerNoun.includes('android') || lowerNoun.includes('cyborg') || lowerNoun.includes('ai')) {
    return FANTASY_NAMES.robot[index % FANTASY_NAMES.robot.length]
  }
  if (lowerNoun.includes('knight') || lowerNoun.includes('lord') || lowerNoun.includes('lady') || lowerNoun.includes('baron')) {
    return FANTASY_NAMES.medieval[index % FANTASY_NAMES.medieval.length]
  }
  if (lowerNoun.includes('mage') || lowerNoun.includes('sorcerer') || lowerNoun.includes('witch')) {
    return FANTASY_NAMES.wizard[index % FANTASY_NAMES.wizard.length]
  }
  if (lowerNoun.includes('samurai') || lowerNoun.includes('assassin')) {
    return FANTASY_NAMES.ninja[index % FANTASY_NAMES.ninja.length]
  }
  if (lowerNoun.includes('hero') || lowerNoun.includes('villain') || lowerNoun.includes('mutant')) {
    return FANTASY_NAMES.superhero[index % FANTASY_NAMES.superhero.length]
  }
  
  return FANTASY_NAMES.default[index % FANTASY_NAMES.default.length]
}

/**
 * Get specialization for professional agents
 */
function getSpecialization(agentNoun: string, index: number): string {
  const lowerNoun = agentNoun.toLowerCase()
  
  for (const [profession, specs] of Object.entries(SPECIALIZATIONS)) {
    if (lowerNoun.includes(profession)) {
      return specs[index % specs.length]
    }
  }
  
  return SPECIALIZATIONS.default[index % SPECIALIZATIONS.default.length]
}

/**
 * Get traits for a specific occupation or use defaults
 */
function getOccupationTraits(agentNoun: string, index: number): string[] {
  const lowerNoun = agentNoun.toLowerCase()
  
  for (const [occupation, traitSets] of Object.entries(OCCUPATION_TRAITS)) {
    if (lowerNoun.includes(occupation)) {
      const traitSet = traitSets[index % traitSets.length]
      return traitSet.slice(0, 2)
    }
  }
  
  // Default traits
  const defaultTraits = OCCUPATION_TRAITS.default[index % OCCUPATION_TRAITS.default.length]
  return defaultTraits.slice(0, 2)
}

/**
 * Generate behavior prompt based on agent type and task
 */
function generateBehavior(
  displayName: string,
  agentNoun: string,
  taskType: string,
  taskVerb: string,
  traits: string[],
  specialization?: string
): string {
  const traitsStr = traits.join(' and ')
  const specStr = specialization ? ` with expertise in ${specialization}` : ''
  
  const behaviorTemplates: Record<string, string> = {
    rating: `${displayName} will ${taskVerb} the content on a scale of 1-10, providing detailed justification based on their ${traitsStr} perspective${specStr}.`,
    reaction: `${displayName} will watch/experience the content and provide their genuine reaction, influenced by their ${traitsStr} nature${specStr}.`,
    analysis: `${displayName} will analyze the material using their ${traitsStr} approach${specStr}, identifying key points and providing thoughtful recommendations.`,
    testing: `${displayName} will attempt to answer the questions, with performance influenced by their ${traitsStr} characteristics${specStr}.`,
    creation: `${displayName} will create/generate content based on the input, reflecting their unique ${traitsStr} style${specStr}.`,
    voting: `${displayName} will make their selection based on their ${traitsStr} preferences${specStr}, explaining their choice.`,
    debate: `${displayName} will present their perspective on the topic, drawing from their ${traitsStr} viewpoint${specStr}.`,
    custom: `${displayName} will process the input as a ${agentNoun}, applying their ${traitsStr} approach${specStr}.`
  }
  
  return behaviorTemplates[taskType] || behaviorTemplates.custom
}

// =============================================================================
// MAIN GENERATION FUNCTION
// =============================================================================

function generateUniversalAgent(
  index: number,
  globalIndex: number,
  request: BatchRequest
): GeneratedAgent {
  const { agentNoun, namingStyle, taskType, taskVerb, taskContext, demographicMix } = request
  
  // Determine demographic
  const demographicKeys = demographicMix || Object.keys(DEMOGRAPHICS)
  const demographicKey = demographicKeys[globalIndex % demographicKeys.length] as keyof typeof DEMOGRAPHICS
  const demographic = DEMOGRAPHICS[demographicKey] || DEMOGRAPHICS['millennial']
  
  // Generate age within demographic range
  const age = getRandomInt(demographic.ageRange[0], demographic.ageRange[1])
  
  // Generate personality
  const personality = getRandomElement(PERSONALITY_TYPES)
  
  // Get occupation-specific traits
  const traits = getOccupationTraits(agentNoun, globalIndex)
  
  // Generate name based on naming style
  let displayName: string
  let firstName: string
  let culturalBackground: string
  let title: string | undefined
  let specialization: string | undefined
  
  switch (namingStyle) {
    case 'professional': {
      const humanName = generateHumanName(globalIndex)
      firstName = humanName.firstName
      culturalBackground = humanName.culturalBackground
      title = PROFESSIONAL_TITLES[globalIndex % PROFESSIONAL_TITLES.length]
      specialization = getSpecialization(agentNoun, globalIndex)
      displayName = `${title} ${firstName}`
      break
    }
    
    case 'fantasy': {
      displayName = getFantasyName(agentNoun, globalIndex)
      firstName = displayName
      culturalBackground = 'fantasy'
      break
    }
    
    case 'numbered': {
      const nounCapitalized = agentNoun.charAt(0).toUpperCase() + agentNoun.slice(1)
      displayName = `${nounCapitalized}-${String(globalIndex + 1).padStart(4, '0')}`
      firstName = displayName
      culturalBackground = 'synthetic'
      break
    }
    
    case 'casual':
    default: {
      const humanName = generateHumanName(globalIndex)
      firstName = humanName.firstName
      culturalBackground = humanName.culturalBackground
      displayName = firstName
      break
    }
  }
  
  // Generate behavior
  const behavior = generateBehavior(displayName, agentNoun, taskType, taskVerb, traits, specialization)
  
  // Build node label
  const nounCapitalized = agentNoun.charAt(0).toUpperCase() + agentNoun.slice(1)
  const label = `${nounCapitalized} ${globalIndex + 1} - ${displayName}`
  
  return {
    type: 'brainNode',
    label,
    payload: {
      label,
      agentNoun,
      persona: {
        name: firstName,
        displayName,
        culturalBackground,
        ageGroup: demographic.label,
        age,
        personality,
        traits,
        ...(specialization && { specialization }),
        ...(title && { title }),
      },
      behavior,
    }
  }
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json()
    const { 
      batchNumber, 
      batchSize, 
      totalCount, 
      agentNoun,
      agentNounPlural,
      namingStyle,
      taskType,
      taskVerb,
      taskContext, 
      demographicMix 
    } = body
    
    // Validate
    if (batchNumber < 0 || batchSize <= 0 || totalCount <= 0) {
      return NextResponse.json({ error: 'Invalid batch parameters' }, { status: 400 })
    }
    
    const startIndex = batchNumber * batchSize
    const endIndex = Math.min(startIndex + batchSize, totalCount)
    const actualBatchSize = endIndex - startIndex
    
    if (actualBatchSize <= 0) {
      return NextResponse.json({ 
        agents: [], 
        isComplete: true,
        progress: { current: totalCount, total: totalCount }
      })
    }
    
    console.log(`[Batch API] Generating batch ${batchNumber + 1}: ${actualBatchSize} ${agentNounPlural} (${namingStyle} naming)`)
    
    // Generate agents for this batch
    const agents: GeneratedAgent[] = []
    for (let i = 0; i < actualBatchSize; i++) {
      const globalIndex = startIndex + i
      
      const agent = generateUniversalAgent(i, globalIndex, {
        batchNumber,
        batchSize,
        totalCount,
        agentNoun,
        agentNounPlural,
        namingStyle,
        taskType,
        taskVerb,
        taskContext,
        demographicMix
      })
      
      agents.push(agent)
    }
    
    const isComplete = endIndex >= totalCount
    
    return NextResponse.json({
      success: true,
      agents,
      batchNumber,
      isComplete,
      progress: {
        current: endIndex,
        total: totalCount,
        percentage: Math.round((endIndex / totalCount) * 100)
      }
    })
    
  } catch (error) {
    console.error('Batch generation error:', error)
    return NextResponse.json({ error: 'Batch generation failed' }, { status: 500 })
  }
}
