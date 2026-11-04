// The Wondar Big Ten pilot list. Seeds the bigTenTesters table
// (scripts/bigTen:seedRoster) and drives the bulk email scripts.

export type RosterEntry = {
    email: string;
    firstName: string;
    role: "CLIENT" | "CREATIVE";
    note: string;
};

export const BIG_TEN_ROSTER: RosterEntry[] = [
    {
        email: "soulfullyplantd@gmail.com",
        firstName: "Lamisha",
        role: "CREATIVE",
        note: "influencer/culinary",
    },
    {
        email: "Ciaraward22@gmail.com",
        firstName: "Ciara",
        role: "CREATIVE",
        note: "influencer/podcast host",
    },
    {
        email: "wlaquinn@yahoo.com",
        firstName: "Laquinn",
        role: "CREATIVE",
        note: "barber/influencer/rapper",
    },
    {
        email: "dylanthagoat100@gmail.com",
        firstName: "Dylan",
        role: "CREATIVE",
        note: "influencer/pod host",
    },
    {
        email: "chidiebere19800@gmail.com",
        firstName: "Chidi",
        role: "CREATIVE",
        note: "influencer/podcast host",
    },
    {
        email: "Mariej_eustache@yahoo.com",
        firstName: "Josee",
        role: "CREATIVE",
        note: "actress/model/podcast host/influencer",
    },
    {
        email: "Tieharri@yahoo.com",
        firstName: "Tierra",
        role: "CLIENT",
        note: "app user/author/client",
    },
    {
        email: "deshyaeasley123@gmail.com",
        firstName: "Deshya",
        role: "CREATIVE",
        note: "hair dresser",
    },
    {
        email: "ayannawardlow@gmail.com",
        firstName: "Yanni",
        role: "CREATIVE",
        note: "model/influencer/actress",
    },
    {
        email: "aniyah87915@gmail.com",
        firstName: "Aniyah",
        role: "CREATIVE",
        note: "illustrator",
    },
    {
        email: "saltdesignandetc@gmail.com",
        firstName: "Stephanie",
        role: "CREATIVE",
        note: "custom apparel and wood worker",
    },
    {
        email: "presidentbones@gmail.com",
        firstName: "Marcus",
        role: "CREATIVE",
        note: "added after the first batch",
    },
];
