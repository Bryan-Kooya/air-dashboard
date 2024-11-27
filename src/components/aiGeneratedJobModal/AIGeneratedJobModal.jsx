import React from 'react';
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';

const AIGeneratedJobModal = ({
  open,
  onClose,
  generatedDescription,
  tags,
  handleSave,
  loading,
}) => {
  return (
    <Modal open={open} onClose={onClose} aria-labelledby="generated-description-modal">
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
          maxWidth: 600,
          width: '100%',
        }}
      >
        <Typography id="generated-description-modal" variant="h6" gutterBottom>
          Generated Description
        </Typography>
        <TextField
          value={generatedDescription}
          multiline
          rows={8}
          sx={{ mb: 3, width: '100%' }}
          InputProps={{ readOnly: true }}
        />

        <Typography variant="h6" gutterBottom>
          Tags
        </Typography>
        <Box sx={{ mb: 3 }}>
          {tags.map((tag, index) => (
            <Chip key={index} label={tag} sx={{ mr: 1, mb: 1 }} />
          ))}
        </Box>

        <Button
          variant="contained"
          color="success"
          onClick={handleSave}
          disabled={loading}
          fullWidth
        >
          {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save Description'}
        </Button>
      </Box>
    </Modal>
  );
};

export default AIGeneratedJobModal;