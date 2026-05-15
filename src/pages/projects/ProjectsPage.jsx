import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ProjectList from './components/ProjectList';
import ClusterList from './components/ClusterList';
import UnitList from './components/UnitList';
import UnitDetailPanel from './components/UnitDetailPanel';
import { projectsAPI, clustersAPI, unitsAPI } from '../../api/services';
import { PageLoader, TableSkeleton, DashboardSkeleton } from '../../components/ui';

function ClusterListRoute() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    projectsAPI.get(projectId)
      .then(r => setProject(r.data.data))
      .catch(console.error);
  }, [projectId]);

  if (!project) return <TableSkeleton />;
  return <ClusterList project={project} />;
}

function UnitListRoute() {
  const { projectId, clusterId } = useParams();
  const [project, setProject] = useState(null);
  const [cluster, setCluster] = useState(null);

  useEffect(() => {
    Promise.all([
      projectsAPI.get(projectId),
      clustersAPI.get(clusterId)
    ])
    .then(([pRes, cRes]) => {
      setProject(pRes.data.data);
      setCluster(cRes.data.data);
    })
    .catch(console.error);
  }, [projectId, clusterId]);

  if (!project || !cluster) return <TableSkeleton />;
  return <UnitList project={project} cluster={cluster} />;
}

function UnitDetailRoute() {
  const { projectId, clusterId, unitId } = useParams();
  const [project, setProject] = useState(null);
  const [cluster, setCluster] = useState(null);
  const [unit, setUnit] = useState(null);

  useEffect(() => {
    Promise.all([
      projectsAPI.get(projectId),
      clustersAPI.get(clusterId),
      unitsAPI.get(unitId)
    ])
    .then(([pRes, cRes, uRes]) => {
      setProject(pRes.data.data);
      setCluster(cRes.data.data);
      setUnit(uRes.data.data);
    })
    .catch(console.error);
  }, [projectId, clusterId, unitId]);

  if (!project || !cluster || !unit) return <DashboardSkeleton />;
  return <UnitDetailPanel project={project} cluster={cluster} unit={unit} />;
}

export default function ProjectsPage() {
  return (
    <div className="relative w-full h-full">
      <Routes>
        {/* Level 1: Projects */}
        <Route path="/" element={
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ProjectList />
          </div>
        } />

        {/* Level 2: Clusters */}
        <Route path="/:projectId/clusters" element={
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <ClusterListRoute />
          </div>
        } />

        {/* Level 3: Units */}
        <Route path="/:projectId/clusters/:clusterId/units" element={
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <UnitListRoute />
          </div>
        } />

        {/* Level 4: Unit Details */}
        <Route path="/:projectId/clusters/:clusterId/units/:unitId" element={
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <UnitDetailRoute />
          </div>
        } />
      </Routes>
    </div>
  );
}
