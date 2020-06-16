import React, { useState, useCallback } from 'react'

import Card from '@material-ui/core/Card'
import CardHeader from '@material-ui/core/CardHeader'
import CardContent from '@material-ui/core/CardContent'
import IconButton from '@material-ui/core/IconButton'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'

import MoreVert from '@material-ui/icons/MoreVert'
import Delete from '@material-ui/icons/Delete'
import Reorder from '@material-ui/icons/Reorder'

import { Link } from 'react-router-dom'
import truncate from 'truncate'

import TaskStatusRow from './TaskStatusRow'

const JobCard = ({
  id,
  name,
  // quantity,
  printsCompleted,
  totalPrints,
  status,
  tasks,
  cancelTask,
  deleteJob,
  moveToTopOfQueue,
}) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState()

  const openMenu = useCallback(event => setMenuAnchorEl(event.target))
  const closeMenu = useCallback(() => setMenuAnchorEl(null))

  const shortName = truncate(name, 32)

  return (
    <Card>
      <CardHeader
        title={(
          <Link to={`./printing/${id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {shortName}
          </Link>
        )}
        subheader={`${printsCompleted} / ${totalPrints} prints completed`}
        action={
            // hide the delete button when the job is printing
            status !== 'PRINTING'
            && (
            <IconButton
              onClick={openMenu}
            >
              <MoreVert />
            </IconButton>
            )
          }
      />

      <Menu
        id="long-menu"
        anchorEl={menuAnchorEl}
        open={menuAnchorEl != null}
        onClose={closeMenu}
      >
        <MenuItem
          onClick={() => {
            deleteJob({
              variables: {
                jobID: id,
              },
            })
            closeMenu()
          }}
        >
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText primary="Delete Job" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            moveToTopOfQueue({ jobID: id })
            closeMenu()
          }}
        >
          <ListItemIcon>
            <Reorder />
          </ListItemIcon>
          <ListItemText primary="Move to Top of Queue" />
        </MenuItem>
      </Menu>

      <CardContent
        style={{
          paddingTop: 0,
        }}
      >

        {
            /* Task list segment */
            tasks.map(task => (
              <TaskStatusRow
                task={task}
                cancelTask={() => cancelTask({
                  variables: { machineID: task.machine.id },
                })}
                key={task.id}
              />
            ))
          }
      </CardContent>

      {/* Bottom Button Segment */}
      {
          /*
        }
        <CardActions>
          <Button
            size="small"
          >
            MORE DETAILS
          </Button>
        </CardActions>
        {
          */
        }
    </Card>
  )
}

export default JobCard
