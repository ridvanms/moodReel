// All films on the site.
// "newer" = from 2005 or later. "extra" is the answer to the genre's second Oracle question.
// "color" is the colour of the film's card.
const genres = [
  { id: 'horror', name: 'Horror', question: 'Do you want it to be really scary?' },
  { id: 'comedy', name: 'Comedy', question: 'Are you watching with your family?' },
  { id: 'romance', name: 'Romance', question: 'Do you want to laugh too?' },
  { id: 'scifi', name: 'Sci-Fi', question: 'Do you want a film that makes you think?' },
  { id: 'action', name: 'Action', question: 'Do you want non-stop action?' },
  { id: 'animation', name: 'Animation', question: 'Is it okay if you cry a little?' },
];

const films = [
  { id: 'hereditary', title: 'Hereditary', year: 2018, genre: 'horror', director: 'Ari Aster', minutes: 127, extra: true, color: '#926b47',
    description: 'After their grandmother dies, the Graham family slowly learns they inherited something far worse than the house.' },
  { id: 'get-out', title: 'Get Out', year: 2017, genre: 'horror', director: 'Jordan Peele', minutes: 104, extra: false, color: '#5a7d3a',
    description: 'Chris goes to meet his girlfriend’s parents for the first time. They are suspiciously nice. Far too nice.' },
  { id: 'the-shining', title: 'The Shining', year: 1980, genre: 'horror', director: 'Stanley Kubrick', minutes: 146, extra: true, color: '#c8382c',
    description: 'A writer takes a job as the winter caretaker of an empty mountain hotel. Isolation, snow and room 237 do the rest.' },
  { id: 'scream', title: 'Scream', year: 1996, genre: 'horror', director: 'Wes Craven', minutes: 111, extra: false, color: '#c0392b',
    description: 'A masked killer stalks teenagers who know every rule of horror movies. Knowing the rules doesn’t help much.' },

  { id: 'paddington-2', title: 'Paddington 2', year: 2017, genre: 'comedy', director: 'Paul King', minutes: 103, extra: true, color: '#d14635',
    description: 'Paddington tries to buy the perfect present for his aunt and ends up in prison by mistake.' },
  { id: 'superbad', title: 'Superbad', year: 2007, genre: 'comedy', director: 'Greg Mottola', minutes: 113, extra: false, color: '#5c7d2c',
    description: 'Two best friends have one last night before college and a mission to get drinks for a party. Nothing goes to plan.' },
  { id: 'home-alone', title: 'Home Alone', year: 1990, genre: 'comedy', director: 'Chris Columbus', minutes: 103, extra: true, color: '#c0392b',
    description: 'Kevin is accidentally left home for Christmas. At first it’s a dream. Then two burglars show up.' },
  { id: 'groundhog-day', title: 'Groundhog Day', year: 1993, genre: 'comedy', director: 'Harold Ramis', minutes: 101, extra: false, color: '#896b2f',
    description: 'A grumpy weatherman wakes up again and again on the same day in the same small town.' },

  { id: 'crazy-stupid-love', title: 'Crazy, Stupid, Love', year: 2011, genre: 'romance', director: 'Glenn Ficarra, John Requa', minutes: 118, extra: true, color: '#9b693d',
    description: 'A newly dumped husband takes dating lessons from the smoothest guy in the bar. Things get very tangled.' },
  { id: 'la-la-land', title: 'La La Land', year: 2016, genre: 'romance', director: 'Damien Chazelle', minutes: 128, extra: false, color: '#7a3f8f',
    description: 'A jazz pianist and an actress chasing their dreams in Los Angeles fall in love.' },
  { id: 'when-harry-met-sally', title: 'When Harry Met Sally', year: 1989, genre: 'romance', director: 'Rob Reiner', minutes: 96, extra: true, color: '#8b692c',
    description: 'Can men and women just be friends? Harry and Sally test the question over twelve years.' },
  { id: 'titanic', title: 'Titanic', year: 1997, genre: 'romance', director: 'James Cameron', minutes: 194, extra: false, color: '#5c7482',
    description: 'Jack, a poor artist, and Rose, a rich girl, meet on the first voyage of the “unsinkable” ship.' },

  { id: 'arrival', title: 'Arrival', year: 2016, genre: 'scifi', director: 'Denis Villeneuve', minutes: 116, extra: true, color: '#6b7370',
    description: 'Twelve strange ships land around the world. A linguist has to understand the visitors before it’s too late.' },
  { id: 'edge-of-tomorrow', title: 'Edge of Tomorrow', year: 2014, genre: 'scifi', director: 'Doug Liman', minutes: 113, extra: false, color: '#886a23',
    description: 'A soldier dies in his first battle and wakes up the day before. Every day is another try.' },
  { id: 'the-matrix', title: 'The Matrix', year: 1999, genre: 'scifi', director: 'Lana and Lilly Wachowski', minutes: 136, extra: true, color: '#238745',
    description: 'A hacker finds out that the world around him is a simulation. Red pill or blue pill?' },
  { id: 'back-to-the-future', title: 'Back to the Future', year: 1985, genre: 'scifi', director: 'Robert Zemeckis', minutes: 116, extra: false, color: '#9d650b',
    description: 'Marty travels to 1955 in a time-travelling car and accidentally stops his parents from meeting.' },

  { id: 'mad-max', title: 'Mad Max: Fury Road', year: 2015, genre: 'action', director: 'George Miller', minutes: 120, extra: true, color: '#b45a17',
    description: 'A desert, a tyrant and a two-hour chase with no breaks.' },
  { id: 'the-dark-knight', title: 'The Dark Knight', year: 2008, genre: 'action', director: 'Christopher Nolan', minutes: 152, extra: false, color: '#2f6690',
    description: 'Batman has almost cleaned up Gotham. Then the Joker arrives.' },
  { id: 'die-hard', title: 'Die Hard', year: 1988, genre: 'action', director: 'John McTiernan', minutes: 132, extra: true, color: '#cb4530',
    description: 'A New York cop, barefoot and alone, against terrorists in a skyscraper on Christmas Eve.' },
  { id: 'gladiator', title: 'Gladiator', year: 2000, genre: 'action', director: 'Ridley Scott', minutes: 155, extra: false, color: '#8c6b34',
    description: 'A Roman general is betrayed and sold as a slave. The arena is his only way to get revenge.' },

  { id: 'coco', title: 'Coco', year: 2017, genre: 'animation', director: 'Lee Unkrich', minutes: 105, extra: true, color: '#a9611b',
    description: 'Miguel dreams of playing music, but his family hates it. On the Day of the Dead he ends up in the land of his ancestors.' },
  { id: 'spider-verse', title: 'Spider-Man: Into the Spider-Verse', year: 2018, genre: 'animation', director: 'Peter Ramsey and others', minutes: 117, extra: false, color: '#e3263b',
    description: 'Teenager Miles Morales becomes Spider-Man just as other Spider-People arrive from other worlds.' },
  { id: 'the-lion-king', title: 'The Lion King', year: 1994, genre: 'animation', director: 'Roger Allers, Rob Minkoff', minutes: 88, extra: true, color: '#9e6939',
    description: 'Young lion Simba runs away after a tragedy he blames himself for.' },
  { id: 'toy-story', title: 'Toy Story', year: 1995, genre: 'animation', director: 'John Lasseter', minutes: 81, extra: false, color: '#1e5aa8',
    description: 'Woody is Andy’s favourite toy, until space ranger Buzz arrives and has no idea he is a toy.' },
];
