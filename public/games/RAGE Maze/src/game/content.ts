import type { TrapType, Side } from './types';

export type CamFx = 'fall' | 'crush' | 'tilt' | 'up' | 'shake' | 'flat';

export interface TrapInfo {
  type: TrapType;
  name: string;
  delay: number; // seconds after trigger until kill check
  killFrom: number; // corridor cell index range (inclusive)
  killTo: number;
  camFx: CamFx;
  quips: string[];
  weight: number;
}

export const TRAPS: Record<TrapType, TrapInfo> = {
  boulder: {
    type: 'boulder', name: 'Big Rock', delay: 0.85, killFrom: 1, killTo: 3, camFx: 'crush', weight: 3,
    quips: ['A big rock. The classics never die. You do.', 'Geology: 1. You: 0.', 'It was hanging RIGHT THERE. Look up sometimes.'],
  },
  piano: {
    type: 'piano', name: 'Grand Piano', delay: 0.9, killFrom: 1, killTo: 3, camFx: 'crush', weight: 1.5,
    quips: ['Ba-dum. Tss.', 'A piano. In a maze. Don\'t ask questions.', 'That was a C minor. As in, you\'re a minor smudge now.'],
  },
  anvil: {
    type: 'anvil', name: 'Anvil', delay: 0.8, killFrom: 1, killTo: 3, camFx: 'crush', weight: 1.5,
    quips: ['ACME sends its regards.', 'Anvil. Very cartoon. Very dead.', 'You looked up too late. Or not at all.'],
  },
  safe: {
    type: 'safe', name: 'Falling Safe', delay: 0.8, killFrom: 1, killTo: 3, camFx: 'crush', weight: 1,
    quips: ['A safe fell on you. The irony is not lost on me.', 'The only "safe" in this maze. Ha.', 'Contents of the safe: your regrets.'],
  },
  pit: {
    type: 'pit', name: 'Trapdoor', delay: 0.05, killFrom: 2, killTo: 2, camFx: 'fall', weight: 3,
    quips: ['The floor had one job.', 'It\'s a long way down. Enjoy the view.', 'That floor was cracked. You saw it. You walked on it anyway.'],
  },
  spikes: {
    type: 'spikes', name: 'Spikes', delay: 0.45, killFrom: 1, killTo: 3, camFx: 'tilt', weight: 3,
    quips: ['Pointy.', 'Those little holes in the floor? Yeah. Those.', 'Spikes. Nature\'s way of saying no.'],
  },
  crusher: {
    type: 'crusher', name: 'Wall Crusher', delay: 0.9, killFrom: 1, killTo: 3, camFx: 'crush', weight: 2,
    quips: ['Personal space: violated.', 'Squish. Flat is a shape too.', 'The walls looked different there. Metal walls. Suspicious walls.'],
  },
  arrows: {
    type: 'arrows', name: 'Arrow Wall', delay: 0.5, killFrom: 1, killTo: 3, camFx: 'tilt', weight: 2.5,
    quips: ['Ventilated.', 'Those holes in the wall weren\'t decorative.', 'You\'re now 40% arrow by volume.'],
  },
  lava: {
    type: 'lava', name: 'Lava Floor', delay: 0.7, killFrom: 1, killTo: 4, camFx: 'fall', weight: 2,
    quips: ['The floor is lava. Literally. Not the game.', 'Toasty.', 'It was glowing a little. You noticed. You didn\'t care.'],
  },
  bomb: {
    type: 'bomb', name: 'Suspicious Barrel', delay: 1.2, killFrom: 1, killTo: 4, camFx: 'shake', weight: 2,
    quips: ['The barrel had a fuse. A lit one. You walked toward it.', 'Kaboom. You had a whole second to run.', 'Should\'ve run. Fast. Backwards.'],
  },
  laser: {
    type: 'laser', name: 'Laser Grid', delay: 0.7, killFrom: 1, killTo: 3, camFx: 'tilt', weight: 2,
    quips: ['Laser grid. Very 2003.', 'Sliced. Diced. Julienned.', 'The red dots on the wall were not fairy lights.'],
  },
  mimic: {
    type: 'mimic', name: 'Mimic Chest', delay: 0.95, killFrom: 1, killTo: 3, camFx: 'tilt', weight: 2,
    quips: ['The eyes blinked at you. You kept walking.', 'Free loot? In THIS maze?', 'It had teeth. Chests don\'t usually have teeth.'],
  },
  ceiling: {
    type: 'ceiling', name: 'Descending Ceiling', delay: 1.4, killFrom: 1, killTo: 4, camFx: 'crush', weight: 1.5,
    quips: ['Slow. Loud. Avoidable. And yet.', 'You had 1.3 seconds. That\'s a lot of seconds.', 'The chains were a hint. A dangling, obvious hint.'],
  },
  gas: {
    type: 'gas', name: 'Gas Vent', delay: 1.3, killFrom: 1, killTo: 4, camFx: 'flat', weight: 1.5,
    quips: ['Smells like regret.', 'Green mist. You inhaled anyway.', 'Vents in the wall. Green vents. Hmm.'],
  },
  gravity: {
    type: 'gravity', name: 'Gravity Fault', delay: 0.35, killFrom: 1, killTo: 3, camFx: 'up', weight: 1,
    quips: ['Gravity has opinions about you.', 'You fell up. Into the sky. Forever.', 'The floating pebbles were a clue. A floaty clue.'],
  },
  zap: {
    type: 'zap', name: 'Electric Floor', delay: 0.5, killFrom: 1, killTo: 3, camFx: 'tilt', weight: 2,
    quips: ['Bzzt.', 'Shocking. Truly.', 'Those metal plates hummed. You hummed along. Now you\'re toast.'],
  },
};

export const TRAP_LIST = Object.values(TRAPS);

export const SIDE_WORD: Record<Side, string> = { left: 'LEFT', forward: 'STRAIGHT', right: 'RIGHT' };

// Advice templates. {D} replaced by side word.
export const SAFE_CLAIMS = [
  ['GO {D}.', 'TRUST ME.'],
  ['{D} IS SAFE.', 'PROBABLY.'],
  ['{D}.', 'JUST GO {D}.'],
  ['THE {D} PATH IS FINE.', 'I CHECKED.'],
  ['GO {D}', 'IF YOU WANT TO LIVE'],
  ['EVERYONE GOES {D}.', 'EVERYONE.'],
  ['{D} IS THE WAY.', '- MANAGEMENT'],
  ['PSST. {D}.', 'YOU DIDN\'T HEAR IT FROM ME.'],
  ['I WOULD GO {D}.', 'BUT I\'M A SIGN.'],
  ['{D} = GOOD', 'OTHERS = BAD'],
  ['HONESTLY? {D}.', 'I\'M TIRED OF LYING.'],
];

export const DEADLY_CLAIMS = [
  ['DON\'T GO {D}.', ''],
  ['WHATEVER YOU DO,', 'DO NOT GO {D}.'],
  ['{D} = DEATH', 'SERIOUSLY.'],
  ['MY COUSIN WENT {D}.', 'HAVEN\'T HEARD FROM HIM SINCE.'],
  ['NOT {D}.', 'I MEAN IT.'],
  ['{D} IS CLOSED', 'FOR "MAINTENANCE"'],
  ['AVOID {D}.', 'THIS IS NOT A TEST.'],
  ['SOMETHING BAD IS {D}.', 'SOMETHING VERY BAD.'],
  ['{D}? NO.', 'ABSOLUTELY NOT.'],
  ['PLEASE DON\'T GO {D}.', 'I\'M BEGGING YOU.'],
];

export const NO_INFO_SIGNS = [
  ['NO HINT THIS TIME.', 'GOOD LUCK.'],
  ['TRUST YOUR INSTINCTS.', '(THEY\'RE WRONG)'],
  ['ONE OF THESE IS SAFE.', 'THAT\'S ALL I KNOW.'],
  ['I\'M JUST A SIGN.', 'WHY ARE YOU LOOKING AT ME?'],
  ['THE MAZE KNOWS', 'WHAT YOU DID.'],
  ['PICK ONE.', 'ANY ONE. I DON\'T CARE.'],
  ['HAVE YOU TRIED', 'LOOKING UP?'],
  ['LOOK AT THE FLOOR.', 'LOOK AT THE WALLS. THINK.'],
];

export const DIED_DISOBEYED = [
  'Told you not to go {d}.',
  'I literally wrote it on a sign.',
  'Reading: it\'s fundamental.',
  'The sign tried. The sign really tried.',
  'What part of "don\'t" was unclear?',
  'You saw the warning. You chose violence.',
  'That was a warning, not a dare.',
];

export const DIED_OBEYED = [
  'Don\'t blindly trust anyone.',
  'You believed a sign. In a death maze.',
  'Trust is a beautiful thing. Was.',
  'The sign lied. Signs do that.',
  'Never trust anything that can\'t die.',
  'Blind faith: now with 100% more rock.',
  'It said "trust me". That was the red flag.',
];

export const DIED_NEUTRAL = [
  'Well. That happened.',
  'Wrong. So very wrong.',
  'The maze thanks you for your contribution.',
  'That was the bad one.',
  'Ouch. Emotionally and physically.',
  'Nope. Not that one.',
];

export const DIED_REPEAT = [
  'Same path. Same trap. Same you.',
  'Again? It\'s the SAME trap.',
  'At this point it\'s a lifestyle choice.',
  'I\'m not even mad. Okay, I\'m a little mad.',
  'You know what\'s there. You KNOW.',
  'The definition of insanity, they say.',
];

export const SURVIVED_OBEYED = [
  'Honest sign. Don\'t get used to it.',
  'See? Sometimes it\'s true. Sometimes.',
  'The sign told the truth. Weird, right?',
  'Trust rewarded. This once.',
];

export const SURVIVED_DISOBEYED = [
  'Ignored the sign. Correct. This time.',
  'Trust issues: paying off.',
  'You didn\'t listen. Good instinct.',
  'The sign was lying. You knew.',
];

export const SURVIVED_NEUTRAL = [
  'Lucky. Or smart. Let\'s say lucky.',
  'That one was safe. Somehow.',
  'You live. For now.',
  'Onward, brave idiot.',
  'Correct! Don\'t ask how.',
];

export const DODGED = [
  'You DODGED that?! Fine. Have some points.',
  'Reflexes. Annoying. Impressive.',
  'You escaped the trap. The trap is embarrassed.',
  'Okay, that was actually cool. Don\'t get cocky.',
];

export const SCARE_QUIPS = [
  'Just kidding. That one was safe.',
  'Relax. Heart rate is a sign of life.',
  'Made you flinch.',
  'The maze has a sense of humor. Sort of.',
];

export const GREED_QUIPS = [
  'Greed. Classic.',
  'You followed shiny things into a hole. Like a raccoon.',
  'Coins aren\'t worth much when you\'re flat.',
];

export const CAKE_QUIPS = [
  'The cake was a lie. Nobody saw that coming.',
  'Free cake in a death maze. Sure. Makes sense.',
];

export const DAVE_QUIPS = [
  'Dave lied. Dave is also dead, so.',
  'Dave\'s skeleton was RIGHT THERE.',
];

export const EXIT_QUIPS = [
  'The EXIT sign was decorative.',
  'Anyone can buy an EXIT sign online.',
];

export const HUB_TOASTS = [
  'Room {n} cleared.',
  'Still alive. Statistically unlikely.',
  'Deeper into the lies.',
  'The maze adjusts its expectations.',
  'Nice. Now do it {left} more times.',
  'You\'re doing great. (I\'m a menu, I have to say that.)',
];

export interface Zone {
  name: string;
  tint: string;
  taunt: string;
}

export const ZONES: Zone[] = [
  {
    name: 'THE CATACOMBS', tint: '#ffffff',
    taunt: 'The Architect: "Welcome back to the catacombs. Cozy, isn\'t it?"',
  },
  {
    name: 'THE RUSTED VAULT', tint: '#ffd9a8',
    taunt: 'The Architect: "Entering the RUSTED VAULT. Lock your doors. Oh wait — I did."',
  },
  {
    name: 'THE FROZEN CRYPT', tint: '#a8dcff',
    taunt: 'The Architect: "The FROZEN CRYPT. Your scream will echo beautifully here."',
  },
  {
    name: 'THE EMBER FORGE', tint: '#ffab8a',
    taunt: 'The Architect: "Ah, the EMBER FORGE. The traps here are extra toasty."',
  },
  {
    name: 'THE MOSS GARDENS', tint: '#b8ffb0',
    taunt: 'The Architect: "THE MOSS GARDENS. Nature\'s deadliest lobby."',
  },
];

// Hand-scrawled wall graffiti. '|' splits into lines.
export const GRAFFITI: string[] = [
  'DAVE|WAS HERE',
  'the signs lie',
  'the signs tell|the TRUTH',
  'GO BACK',
  'i chose wrong too',
  'look up.',
  'DON\'T|LOOK UP',
  'FREE CAKE →',
  'it\'s always|the middle one',
  'help',
  'you\'re doing|amazing sweetie',
  'trust the neon ones',
  'NEVER trust|the neon ones',
  'wall',
  '?',
  '? ? ?',
  'i heard a piano',
  'the floor|is a liar',
  '74 rooms left|i think',
  'RUN',
  'this way out →|← this way out',
  'the game is|watching you',
  'why are you|reading walls',
  'salt the carpet.|the maze hates it.',
  'BEWARE THE|HUNGRY CHEST',
  'don\'t feed|the barrels',
  'made it to 60|then the cake',
  'trust issues|this way →',
  'the exit moved',
  'caption contest:|YOU DIE',
];

export const TIPS = [
  'Look UP before walking under things.',
  'Cracked floors are cracked for a reason.',
  'Holes in the walls shoot things. Always.',
  'A chest that watches you is not a chest.',
  'Signs lie about half the time. Which half? Ha.',
  'A dead path stays dead. Remember it.',
  'Backing up quickly can save you from slow traps.',
  'Dave is dead. Don\'t be like Dave.',
  'Metal walls crush. Glowing floors burn. Chains drop.',
  'Coins are worth points. Coins are also bait.',
];
