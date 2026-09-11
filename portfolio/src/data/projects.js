import pcsp from './projects/pcsp'
import project1 from './projects/project1'
import project2 from './projects/project2'
import project3 from './projects/project3'
import project4 from './projects/project4'
import project5 from './projects/project5'

export const projects = [pcsp, project1, project5, project2, project3, project4]

export const getProjectBySlug = (slug) => projects.find((project) => project.slug === slug)
