import { User, UserRole, Announcement, Exam, Poll, Meeting, ScheduleItem, ForumPost } from '../types';

export const MOCK_USERS: User[] = [
    {
        id: 'admin-1',
        name: 'Administration',
        email: 'admin@janghub.sn',
        role: UserRole.ADMIN,
        classLevel: 'ADMINISTRATION',
        avatar: 'https://ui-avatars.com/api/?name=Administration&background=2F6FB2&color=fff'
    },
    {
        id: 'del-1',
        name: 'Moussa Diop (Délégué)',
        email: 'moussa@janghub.sn',
        role: UserRole.RESPONSIBLE,
        classLevel: 'Licence 2 - Info',
        avatar: 'https://ui-avatars.com/api/?name=Moussa+Diop&background=0D8ABC&color=fff'
    },
    {
        id: 'etu-1',
        name: 'Fatou Ndiaye',
        email: 'fatou@janghub.sn',
        role: UserRole.STUDENT,
        classLevel: 'Licence 2 - Info',
        avatar: 'https://ui-avatars.com/api/?name=Fatou+Ndiaye&background=random'
    }
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
    {
        id: '1',
        authorId: 'admin-1',
        authorName: 'Administration',
        classLevel: 'Licence 2 - Info',
        content: 'Les réinscriptions pour le second semestre sont ouvertes jusqu\'au 15 Mars. Veuillez passer au service scolarité.',
        date: new Date().toISOString(),
        links: [],
        images: [],
        attachments: []
    },
    {
        id: '2',
        authorId: 'del-1',
        authorName: 'Moussa Diop',
        classLevel: 'Licence 2 - Info',
        content: 'Le prof de Java sera absent ce mardi matin. Le cours est reporté à Jeudi 14h.',
        date: new Date(Date.now() - 86400000).toISOString(),
        links: [],
        images: [],
        attachments: []
    }
];

export const MOCK_EXAMS: Exam[] = [
    {
        id: '1',
        subject: 'Algorithmique Avancée',
        classLevel: 'Licence 2 - Info',
        date: new Date(Date.now() + 86400000 * 2).toISOString(), // Dans 2 jours
        duration: '3h',
        room: 'Amphi A',
        notes: 'Calculatrice interdite',
        authorId: 'admin-1'
    },
    {
        id: '2',
        subject: 'Base de Données',
        classLevel: 'Licence 2 - Info',
        date: new Date(Date.now() + 86400000 * 5).toISOString(),
        duration: '2h',
        room: 'Salle 204',
        notes: 'Revoir le chapitre sur SQL',
        authorId: 'admin-1'
    }
];

export const MOCK_POLLS: Poll[] = [
    {
        id: '1',
        question: 'Quel jour préférez-vous pour le rattrapage de Réseaux ?',
        classLevel: 'Licence 2 - Info',
        options: [
            { id: 'opt1', text: 'Samedi Matin', votes: 12 },
            { id: 'opt2', text: 'Mercredi Soir', votes: 8 }
        ],
        authorId: 'del-1',
        active: true,
        totalVotes: 20
    }
];

export const MOCK_MEETINGS: Meeting[] = [
    {
        id: '1',
        title: 'Cours Anglais Technique',
        classLevel: 'Licence 2 - Info',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        link: 'https://meet.google.com/abc-defg-hij',
        platform: 'Google Meet',
        authorId: 'admin-1',
        authorName: 'Prof. Diallo'
    }
];

export const MOCK_SCHEDULES: ScheduleItem[] = [
    {
        id: '1',
        title: 'Emploi du temps S1 - L2 Info',
        classLevel: 'Licence 2 - Info',
        semester: 'Semestre 1',
        url: '#',
        uploadedAt: new Date().toISOString(),
        version: 1
    }
];
