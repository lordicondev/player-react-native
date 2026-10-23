// README: "Following your app". A string `value` with a map in `follow`: a state for each
// stage; a loop finishes its round before the next stage, a stage with no state rests.
import { useState } from 'react';
import { LordIcon } from '@lordicon/react-native';
import download from '../icons/download.json';
import { Button } from './ui';

type Stage = 'idle' | 'busy' | 'done';

const LABELS = { idle: 'Download', busy: 'Downloading…', done: 'Downloaded' };

export default function Stages() {
    const [stage, setStage] = useState<Stage>('idle');

    const start = () => {
        if (stage === 'done') return setStage('idle');
        setStage('busy');
        setTimeout(() => setStage('done'), 2500); // the download
    };

    return (
        <Button label={LABELS[stage]} onPress={start} disabled={stage === 'busy'}>
            <LordIcon
                icon={download}
                trigger="follow(busy=loop-cycle, done=morph-check)"
                value={stage}
                size={28}
            />
        </Button>
    );
}
