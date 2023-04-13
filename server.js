/* Expressin päälle rakennettu yksinkertainen GraphQL-serveri.

Data on tiedostossa data.js. Tietokantaa ei ole käytetty esimerkin
kokeilemisen helpottamiseksi.

GraphQL-serverin olennaisimmat osat ovat:
1) GraphQL-skeema, joka kuvaa datan ja kyselyt jotka voidaan siihen kohdistaa.
2) Resolver-funktiot, joita käytetään toimenpiteiden suorittamiseen.
3) Resolver-olio, joka tarjoaa yhteyden kyselytermien ja funktioiden välille.

Kun GraphQL-serverille lähetetään kysely, ensin se validoidaan vertaamalla sitä
skeemaan. Oikean muotoinen kysely voidaan suorittaa. Kysely suoritetaan kutsumalla
resolver-funktiota ja oikea funktio löytyy resolver-oliossa olevan tiedon perusteella.

Kyselyitä voi testata graphiql-clientin avulla ilman oikeaa asiakassovellusta. 
Graphiql tulee graphql-moduulin mukana ja se avautuu kun menet selaimella 
osoitteeseen localhost:3000/graphql 

Voit kokeilla esim. seuraavia kyselyitä:
  // getStudent
 {
    student(id: 1) {
        name
    }
  }

  // getStudent
  {
    student(id: 1) {
        name
        grades {
            coursecode
            grade
        }
    }
  }

  // getStudents
  {
  students(studypoints: 0) {
    name
    studypoints
  }
}

// addStudent
mutation {
    addstudent(input: {
      id: 5, 
      studentcode: "t1234", 
      name: "Testi Opiskelija", 
      email: "t1234@jamk.fi", 
      studypoints: 0, 
      grades: [{coursecode: "HTS106002", grade: 0}]
      })
  {
  name
  }
}
// updStudent
mutation {
  updatestudent(id: 4, input: {
      id: 4, 
      studentcode: "m1234", 
      name: "Mauno Opiskelija", 
      email: "m1234@jamk.fi", 
      studypoints: 5, 
      grades: [{coursecode: "HTS10600", grade: 3}]
      }) 
  {
    name
  }
}
// delStudent
mutation {
 deletestudent(id: 4)
 }

*/
const express = require('express');
// express-graphql -moduuli tarvitaan yhdistämään express ja graphql
const { graphqlHTTP } = require('express-graphql');
// graphql-moduuli sisältää mm. metodit graphql-skeeman rakentamiseen
const { buildSchema } = require('graphql');
// data tiedostosta
const students = require('./data');

/* Funktiot joilla tehdään toimenpiteitä dataan (tiedosto).
Jos käyttäisimme tietokantaa, olisivat tietokantakyselyt
näissä funktioissa.
*/

// Hakee opiskelijan id:n perusteella
const getStudent = (args) => {
  const studentid = args.id;
  return students.filter((student) => student.id == studentid)[0];
};

// Hakee opiskelijoita opintopistemäärän perusteella
const getStudents = (args) => {
  if (args.studypoints !== null) {
    const sp = args.studypoints;
    // hakee opiskelijat joiden op-määrä on <= annettu luku
    return students.filter((student) => student.studypoints <= sp);
  } else {
    return students;
  }
};
// Lisää opiskelijan muistissa olevaan students-taulukkoon
const addStudent = (args) => {
  //console.log(args);
  students.push(args.input);
  return students[students.length - 1]; //palauttaa lisätyn opiskelijan
};
// Päivittää opiskelijan tiedot. Tässä tapauksessa päivittää koko opiskelijan.
// Voitaisiin tehdä myös funktio joka päivittää esim. vain opintopisteet
const updStudent = (args) => {
  const studentid = args.id;
  if (!studentid) {
    throw new Error('Student not found');
  }
  students[studentid - 1] = args.input; // päivittää koko opiskelijan
  return students[studentid - 1]; //palauttaa muokatun opiskelijan
};

const delStudent = (args) => {
  const studentid = args.id;
  if (!studentid) {
    throw new Error('Student not found');
  }
  students.splice(studentid - 1, 1); // poistaa opiskelijan
  return 'Student deleted';
};

/* Luodaan GraphQL-skeema kyselylle
Skeema kuvaa datan, johon GraphQL-kysely voi kohdistua.
*/
const schema = buildSchema(`
type Query {
    student(id: Int!): Student
    students(studypoints: Int): [Student]
  },
type Mutation {
    addstudent(input: StudentInput): Student
    updatestudent(id: Int!, input: StudentInput): Student
    deletestudent(id: Int!): String
  },
  input GradeInput {
    coursecode: String
    grade: Int
  }
  input StudentInput {
      id: Int,
      studentcode: String, 
      name: String, 
      email: String, 
      studypoints: Int, 
      grades: [GradeInput]
  },
  type Grade {
    coursecode: String
    grade: Int
  }
  type Student {
    id: Int
    studentcode: String
    name: String
    email: String
    studypoints: Int
    grades: [Grade]
  }
`);

/* Root resolver (selvittäjä) määrittää resolver-funktiot, joilla suoritetaan
   dataan kohdistuvat toimenpiteet. Oliossa on avaimina kyselyissä
   käytettävät termit ja arvoina funktiot. Resolver siis selvittää mikä 
   funktio vastaa kyselytermiä eli se yhdistää funktiot ja kyselytermit.
*/
const root = {
  student: getStudent, //funktio jolla haetaan opiskelija id:n perusteella
  students: getStudents, //funktio jolla haetaan opiskelijat opintopisteiden perusteella
  addstudent: addStudent, //funktio jolla tehdään mutaatio, eli lisätään uusi opiskelija
  updatestudent: updStudent, // mutaatio, muokataan opiskelijaa
  deletestudent: delStudent, // mutaatio, poistetaan opiskelija
};

// Luodaan Express-serveri ja GraphQL-endpoint
const app = express();
// endpoint luodaan polkuun /graphql
// graphqlHTTP-metodin argumenttina on olio jossa on endpointin asetukset
app.use(
  '/graphql',
  graphqlHTTP({
    // skeema johon kyselyt perustuvat
    schema: schema,
    // resolver-funktiot
    rootValue: root,
    // GraphiQL on graafinen käyttöliittymä, jolla voi testata kyselyitä
    graphiql: true,
  })
);
app.listen(3000, () =>
  console.log('GraphQL-serveri portissa localhost:3000/graphql')
);
