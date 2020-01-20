use std::io::{
    self,
    // Error,
    // ErrorKind,
};
use gcode::GCode;

pub fn whitelist_args(cmd: &GCode, valid_args: &[char]) -> io::Result<()> {
    let invalid = cmd.arguments().iter().any(|word|
        valid_args.iter().any(|letter| *letter == word.letter) == false
    );

    if invalid {
        let msg = format!(
            "Invalid {}{} args: {:?}",
            cmd.mnemonic(),
            cmd.major_number(),
            cmd.arguments(),
        );
        eprintln!("GCode Parser Warning: {}", msg);
        Ok(())
        // Err(Error::new(ErrorKind::Other, msg))
    } else {
        Ok(())
    }
}