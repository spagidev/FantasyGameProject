/**
 * The voices of Veyr (v0.9). Pure text, no rules: what guardians say, what each keeper
 * writes down after a bell, and how each of them lives afterwards. Every keeper tells the
 * same three bells differently, so the story is worth walking three times.
 */

/** Spoken when the fight begins, when a guardian changes pattern, and when it falls. */
export const VOICES: Record<string, { arrive: string; turn?: string; fall?: string }> = {
  bellwether: {
    arrive:
      'It lowers its head, and the cracked bell at its throat gives one dull note. It is counting you, the way it once counted children home across the flood.',
    turn: 'The bell splits. What comes out is not a warning. It is a name it cannot finish.',
    fall: 'The great head settles into the reeds. The bell, relieved of its keeper, rings clear across the water — and far off, under the black lake, a door opens.',
  },
  sentinel: {
    arrive:
      '“Halt,” says the glass, in the voice of every sentry at once. “This road is held until all are through.” It does not ask who is still coming.',
    turn: 'The standard falls. Behind the visor, something remembers that an oath is a promise made to people, and that the people are gone.',
    fall: 'It comes apart gently, pane by pane, like a window being opened. “Relieved,” it says. “At last. Relieved.”',
  },
  king: {
    arrive:
      'He does not rise. “You have my daughter’s word in your pocket,” says the Hollow King. “I gave it to the fire so that I could bear the dark. Do not make me take it back.”',
    turn: '“Eira.” He says it like a man touching a wound. The roots of the throne let go of him, one by one.',
    fall: 'He is only an old man now, and very tired. He holds out the heart of the sun in both hands, the way one offers bread.',
  },
  thornbound: {
    arrive:
      '“No one passes,” it says through the roses. It has said so for so long that the hedge has started to believe it.',
  },
  tollkeeper: {
    arrive: 'The beads click. “One crossing. One remembering. The fare has gone up.”',
  },
  captain: {
    arrive: '“Present arms,” says the Captain, to a rank of empty glass. They do.',
  },
  chorister: {
    arrive: 'It is already singing when you arrive. It was singing before you were born.',
  },
  hand: {
    arrive:
      '“By order of the king,” it begins, and unrolls a warrant with the name left blank. It looks at you, and reaches for a pen.',
  },
  unnamed: {
    arrive: 'You try to look at it, and find you are looking at the wall behind it.',
  },
};

type Page = { id: string; title: string; text: string };
const page = (id: string, title: string, text: string): Page => ({ id, title, text });

/** What each keeper writes after each bell: three pages apiece, found only by walking as them. */
export const KEEPER_PAGES = [
  page(
    'warden-bell-1',
    'Asha · The ninth bell',
    'The night the dark came, I shut the gate of Cinderfall at the ninth bell, as ordered. There were still lanterns on the road. For twenty years I have told myself that bell was a warning. It was not. It was calling them in, and I was the one who closed the door.',
  ),
  page(
    'warden-bell-2',
    'Asha · Off its hinges',
    'The glass soldiers held a road open until the last of their people were through, and nobody came to relieve them. I know that posture. I see it in the mirror. Tonight I took a door off its hinges for the first time in my life, and I did not put it back.',
  ),
  page(
    'warden-bell-3',
    'Asha · The keys',
    'He locked the sun away so that one name would stop burning. I locked a gate so that a city would. We were both keeping something safe, and both wrong about what. When I go home I am going to ask the council for the keys. Then I am going to lose them.',
  ),
  page(
    'seer-bell-1',
    'Orin · A poor choice of trade',
    'I became an astronomer the year the stars went out, which my mother called a poor choice of trade. I drew the sky from memory until I could not tell memory from wishing. Tonight a bell rang and, for the length of its note, I saw the Plough exactly where I had drawn it. I was not wishing.',
  ),
  page(
    'seer-bell-2',
    'Orin · A sentry of the sky',
    'The glass army kept faith with an order nobody living remembers giving. I have kept faith with a sky. I used to think that made me a fool. Standing among them, I think it makes me a sentry — and that somebody, some day, is meant to come and tell me the stars are through.',
  ),
  page(
    'seer-bell-3',
    'Orin · What the ashes say',
    'I had a theory that the future could be read in ashes. It can. It says: whatever you burn to see by, you will not have when morning comes. The king read it nine hundred winters before I did. I should like to show him my charts. I think he would know some of the names.',
  ),
  page(
    'wayfarer-bell-1',
    'Sable · Under a stone',
    'My satchel holds forty-one letters for places that are not there. I deliver them anyway: I read the address aloud at the right milestone and leave the letter under a stone. After the bell rang I went back to look. The stone had been moved. The letter was gone. There were wet footprints leading down to the water, and they were small.',
  ),
  page(
    'wayfarer-bell-2',
    'Sable · Signed for a queen',
    'A road is only a promise that somebody will come along it. The soldiers of the March understood that better than any postmaster I ever worked for. I left them a letter. It said: “Everyone got through. Thank you. You can go home.” I signed it with the name of a queen. I do not think she would mind.',
  ),
  page(
    'wayfarer-bell-3',
    'Sable · The last letter',
    'The last letter in my satchel has no address, only “Father”, in a child’s hand. It has lain at the bottom of the bag since before the bag was mine. I never knew whose it was. I knew when I saw him. I did not read it; couriers do not. But I watched his face while he did, and that was every wage I was ever owed.',
  ),
] as const;

/** How each keeper lives afterwards, under each of the two endings. */
export const EPILOGUES = [
  page(
    'warden-dawn',
    'Asha · A table for forty',
    'Asha takes the gate of Cinderfall off its hinges and has it made into a table. It seats forty. On the first morning there are not enough chairs, and nobody minds standing.',
  ),
  page(
    'warden-hearth',
    'Asha · The lamp by the gate',
    'Asha keeps the gate, but she keeps it open, and sits beside it with a lamp. Travelers say you can see that lamp from the far side of the Reach. Some of them were not travelers until they saw it.',
  ),
  page(
    'seer-dawn',
    'Orin · The children’s sky',
    'Orin spends the first clear night on a roof with every child in the city, giving the stars back their names. He gets several wrong. The children’s versions are kept.',
  ),
  page(
    'seer-hearth',
    'Orin · The bare patch',
    'Orin paints the old sky on the library ceiling, one constellation a winter. He leaves a patch bare above the hearth. “For the ones we have not remembered yet,” he says.',
  ),
  page(
    'wayfarer-dawn',
    'Sable · Seeds',
    'Sable’s satchel is empty for the first time in her life. She fills it with seeds and walks the old roads again, and where she has been, the milestones flower.',
  ),
  page(
    'wayfarer-hearth',
    'Sable · The year’s round',
    'Sable becomes the library’s only courier. She carries stories out to the dark villages and carries theirs back. The round takes a year. She has never once been late.',
  ),
] as const;

export const pageFor = (id: string): Page | undefined =>
  [...KEEPER_PAGES, ...EPILOGUES].find((p) => p.id === id);
