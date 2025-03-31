import React from 'react';
import { Snackbar, Alert, LinearProgress, Slide } from '@mui/material';
import { CloudArrow } from '../../assets/images';

const GlobalUploadStatus = ({ files, uploadStatus, loading }) => {
  const completed = Object.values(uploadStatus).filter(
    status => status === 'Complete'
  ).length;
  const total = files.length;

  return (
    <Snackbar
      open={loading}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      TransitionComponent={Slide} // Use Slide transition
      TransitionProps={{ direction: "up" }} // Specify the slide direction
    >
      <Alert icon={<img className='animate-flicker' src={CloudArrow}/>} sx={{"& .MuiAlert-icon": {alignItems: 'center', justifyContent: 'center'}}} severity="info">
        <div style={{ width: 170 }}>
          <div>Uploading {completed}/{total} resumes...</div>
          <LinearProgress 
            variant="determinate"
            value={(completed / total) * 100}
            style={{ marginTop: 8 }}
          />
        </div>
      </Alert>
    </Snackbar>
  );
};

export default GlobalUploadStatus;