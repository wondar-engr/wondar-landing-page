export interface GroupSpec {
    slug: string;
    name: string;
    items: string[]; // must match existing serviceCategories names (case, spacing and punctuation are ignored)
}

export const CATEGORY_TREE: GroupSpec[] = [
    {
        slug: "beauty",
        name: "Beauty & Grooming",
        items: [
            "Beauty & Skin",
            "Makeup Artist",
            "Lash Technician",
            "Brow Artist",
            "Esthetician",
            "Hair Stylist",
            "Stylist",
            "Barber",
            "Nail Technician",
        ],
    },
    {
        slug: "photography",
        name: "Photography",
        items: [
            "Photographer",
            "Photo Editor",
            "Wedding Photographer/Videographer",
            "Drone Pilot",
        ],
    },
    {
        slug: "video",
        name: "Videography",
        items: [
            "Videographer",
            "Video Editor",
            "Wedding Photographer/Videographer",
            "Drone Pilot",
        ],
    },
    {
        slug: "music",
        name: "Music & Audio",
        items: [
            "Music Production",
            "Song Writer",
            "Rapper",
            "Singer",
            "Composer",
            "Audio Engineer",
            "Instrument Player",
            "Instrumentalist",
            "Music Band",
        ],
    },
    {
        slug: "food",
        name: "Food & Catering",
        items: ["Caterer", "Culinary Arts"],
    },
    {
        slug: "events",
        name: "Events",
        items: [
            "Event Planner",
            "Caterer",
            "Music Band",
            "Public Speaker",
            "Comedian",
        ],
    },
    {
        slug: "design",
        name: "Design",
        items: [
            "Digital Designer",
            "Product Designer",
            "Brand Designer",
            "Website Designer",
            "Animation Designer",
            "Interior Decorator",
        ],
    },
    {
        slug: "sewing",
        name: "Sewing & Knitting",
        items: [
            "Sewing & Knitting",
            "Seamstress",
            "Tailor",
            "Clothing Designer",
            "Embroidery",
            "Heat Press/DTF Application",
            "Screen Printing",
        ],
    },
    {
        slug: "fashion",
        name: "Fashion & Modeling",
        items: ["Model", "Stylist", "Clothing Designer"],
    },
    {
        slug: "art",
        name: "Art & Craft",
        items: [
            "Painter",
            "Illustrator",
            "Sculptor",
            "Tattoo Artist",
            "3D Printing",
        ],
    },
    {
        slug: "media",
        name: "Acting & Media",
        items: [
            "Actor",
            "Actress",
            "Model",
            "Influencer",
            "Writer",
            "Comedian",
            "Public Speaker",
        ],
    },
    {
        slug: "tech",
        name: "Technology",
        items: [
            "Software Developer",
            "App Developer",
            "Artificial Intelligence",
        ],
    },
    {
        slug: "specialty",
        name: "Specialty Services",
        items: ["Pet Groomer", "Auto Customization"],
    },
];

// PDF entries that don't exist in prod yet. Each needs an image, so they are
// only created when the seed runs with createNew: true. Names are the spellings
// to use if the client adds them in the admin dashboard instead.
export const ADDITIONS: { name: string; slugs: string[] }[] = [
    { name: "Beat Maker", slugs: ["music"] },
    { name: "Music Producer", slugs: ["music"] },
    { name: "Mixing Engineer", slugs: ["music"] },
    { name: "Music Instructor", slugs: ["music"] },
    { name: "Bedazzling", slugs: ["sewing"] },
    { name: "Logo Designer", slugs: ["design"] },
    { name: "Print Designer", slugs: ["design"] },
    { name: "Publishing Designer", slugs: ["design"] },
    { name: "Environmental Designer", slugs: ["design"] },
    { name: "Portrait Photographer", slugs: ["photography"] },
    { name: "Product Photographer", slugs: ["photography"] },
    { name: "Boudoir Photographer", slugs: ["photography"] },
    { name: "Fine Art Photographer", slugs: ["photography"] },
    { name: "Landscape Photographer", slugs: ["photography"] },
    { name: "Cinematographer", slugs: ["video"] },
    { name: "Music Video Producer", slugs: ["video", "music"] },
    { name: "Podcast Producer", slugs: ["video", "media"] },
    { name: "Event Videographer", slugs: ["video", "events"] },
    { name: "Cooking Instructor", slugs: ["food"] },
    { name: "Meal Prep", slugs: ["food"] },
    { name: "Wedding Planner", slugs: ["events"] },
    { name: "Party Planner", slugs: ["events"] },
    { name: "Event Coordinator", slugs: ["events"] },
    { name: "House Painter", slugs: ["art"] },
    { name: "Painting Instructor", slugs: ["art"] },
    { name: "Costume Designer", slugs: ["media", "fashion"] },
    { name: "Special Effects Makeup Artist", slugs: ["media", "beauty"] },
    { name: "Stunt Double", slugs: ["media"] },
    { name: "Tech Support", slugs: ["tech"] },
];
