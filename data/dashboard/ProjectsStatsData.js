import {
	Briefcase,
    ListTask,
    People,
    Bullseye
} from 'react-bootstrap-icons';

export const ProjectsStats = [
    {
       id:1,
       title : "Cuentas",
       value : 18,
       icon: <Briefcase size={18}/>,
       statInfo: '<span className="text-dark me-2">2</span> Conectados' 
    },
    {
        id:2,
        title : "Documentos",
        value : 53,
        icon: <ListTask size={18}/>,
        statInfo: '<span className="text-dark me-2">5</span> Categorías' 
     },
     {
        id:3,
        title : "Miembros Activos",
        value : 132,
        icon: <People size={18}/>,
        statInfo: '<span className="text-dark me-2">28</span> Sin reportar' 
     },
     {
        id:4,
        title : "Eventos",
        value : '76',
        icon: <Bullseye size={18}/>,
        statInfo: '<span className="text-dark me-2">5</span> Finalizados' 
     }
];
export default ProjectsStats;
