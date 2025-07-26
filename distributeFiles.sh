#!/bin/bash

#
#  distribute.sh
#
#  This script contains functions to parse a Markdown file, distribute files,
#  and interactively execute shell commands found within it.
#

# ---
# displayCommands
#
# Parses `Distribute/distributeFiles.md`, finds any commands in ```shell or
# ```bash blocks, and prompts the user to execute each one individually.
# ---
displayCommands() {
  local INPUT_FILE="Distribute/distributeFiles.md"

  # Use awk to find and extract commands from shell or bash blocks.
  local commands
  commands=$(awk '
    # Match the start of a shell or bash code block, allowing for leading whitespace.
    /^[[:space:]]*```(shell|bash)/ { in_block=1; next }
    # Match the end of a code block, allowing for leading whitespace.
    /^[[:space:]]*```/ && in_block { in_block=0; next }
    # If we are inside a block, remove leading whitespace and then print the line.
    in_block {
      sub(/^[[:space:]]+/, "");
      print;
    }
  ' "$INPUT_FILE")

  # If any commands were found, process them.
  if [ -n "$commands" ]; then
    echo
    echo "----------------------------------------"
    echo "Found commands to execute:"
    echo

    # Loop through each command line by line.
    # The `<<< "$commands"` construct avoids subshell issues with the `read` prompt.
    while IFS= read -r command; do
      # Skip any empty lines that might have been captured.
      if [ -z "$command" ]; then
        continue
      fi

      # Prompt the user to execute the current command.
      # Reading from /dev/tty ensures the prompt works even when run via npm.
      read -p "Would you like to run \`$command\`? (y/n) " -n 1 -r < /dev/tty
      echo # Move to a new line for cleaner output.

      # If the user agrees, execute the command.
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "-> Running command..."
        # Use eval to correctly execute commands with arguments and quotes.
        eval "$command"
        echo "-> Command finished."
        echo
      else
        echo "-> Skipped."
        echo
      fi
    done <<< "$commands"
  fi
}


# ---
# distributeFiles
#
# Main function to parse `Distribute/distributeFiles.md`, create or update
# project files, and then display any discovered commands.
#
# - Looks for ```prisma, ```javascript, ```js, or ```json blocks for file creation.
# - Reads the file path from the line immediately following the language identifier.
# - Validates that the path is an allowed project file.
# - Creates directories if they do not exist.
# - Intelligently adds the filepath as a comment for supported file types.
# - Lists all successfully distributed files at the end.
# - Calls displayCommands to list and optionally execute shell commands.
# ---
distributeFiles() {
  # The Markdown file containing the file distribution instructions.
  local INPUT_FILE="Distribute/distributeFiles.md"
  # An array to keep track of files that are successfully created or updated.
  local distributed_files=()

  # --- Safety Check ---
  # Ensure the input file actually exists before proceeding.
  if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file not found at '$INPUT_FILE'"
    echo "Please make sure the file exists in the 'Distribute/' directory."
    return 1
  fi

  # --- Phase 1: Parse the Markdown and store content in a temporary directory ---
  # Create a temporary directory to hold the content of each code block.
  # This completely separates the file parsing from the user interaction phase.
  local temp_dir
  temp_dir=$(mktemp -d)
  # Ensure the temporary directory is removed when the script exits.
  trap 'rm -rf "$temp_dir"' EXIT

  # Use awk to parse the file. For each code block it finds, it will:
  # 1. Sanitize the target filepath to create a safe temporary filename.
  # 2. Save the code content to a file with that name inside our temp directory.
  # 3. Print the *original* target filepath to standard output for the next phase.
  local file_list
  file_list=$(awk -v tmpdir="$temp_dir" '
    function sanitize(path) {
      gsub(/\//, "__", path);
      return path;
    }

    # Match the start of a supported code block, allowing for leading whitespace.
    /^[[:space:]]*```(prisma|javascript|js|json)/ {
      # Get the next line, which should contain the filepath.
      getline;
      filepath = $0;
      
      # Validate the filepath against the allowed patterns.
      is_valid = 0;
      if (filepath ~ /^\/\/ src\// || \
          filepath ~ /^\/\/ server\// || \
          filepath ~ /^\/\/ prisma\// || \
          filepath == "// AGENTS.md" || \
          filepath == "// jsconfig.json" || \
          filepath == "// package.json" || \
          filepath == "// README.md" || \
          filepath == "// eslint.config.mjs" || \
          filepath == "// next.config.mjs") {
        is_valid = 1;
      }

      if (is_valid) {
        # Clean the filepath for use (remove leading comment).
        gsub(/^\/\/ ?/, "", filepath);
        
        # Capture the content of the block.
        content = "";
        while (getline > 0) {
          # Match the end of a code block, allowing for leading whitespace.
          if ($0 ~ /^[[:space:]]*```$/) break;
          content = content $0 "\n";
        }
        
        # Save content to a temporary file and print the real path for the next stage.
        sanitized_path = sanitize(filepath);
        temp_content_file = tmpdir "/" sanitized_path;
        printf "%s", content > temp_content_file;
        print filepath;
      }
    }
  ' "$INPUT_FILE")

  echo "Starting file distribution from '$INPUT_FILE'..."
  echo "----------------------------------------"

  # --- Phase 2: Process each file with user interaction ---
  # Loop through the list of filepaths generated by awk.
  # This loop is not attached to a pipe, so `read` will work correctly.
  for filepath in $file_list; do
    # If the filepath is empty for any reason, skip this iteration.
    if [ -z "$filepath" ]; then
      continue
    fi

    echo "Processing file: $filepath"

    # --- Overwrite Check ---
    # Check if the file already exists on disk.
    # if [ -f "$filepath" ]; then
    #   # Prompt the user for confirmation.
    #   # This will now reliably read from the keyboard.
    #   read -p "  -> Warning: File exists. Overwrite? (y/n) " -n 1 -r
    #   echo # Move to a new line for cleaner output.

    #   # If the reply is not 'y' or 'Y', skip to the next file.
    #   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    #     echo "  -> Skipped."
    #     echo "----------------------------------------"
    #     continue
    #   fi
    # fi

    # --- Directory Creation ---
    local dir
    dir=$(dirname "$filepath")
    if [ ! -d "$dir" ]; then
      echo "  -> Directory '$dir' not found. Creating..."
      mkdir -p "$dir"
    fi

    # --- File Creation ---
    # Sanitize the filepath to find the corresponding temporary content file.
    sanitized_path=$(echo "$filepath" | sed 's/\//__/g')
    temp_content_file="$temp_dir/$sanitized_path"

    if [ -f "$temp_content_file" ]; then
      # Conditionally add the filepath as a comment based on file extension.
      case "$filepath" in
        *.js|*.mjs|*.prisma)
          # For these files, prepend the filepath as a comment.
          echo "// $filepath" > "$filepath"
          cat "$temp_content_file" >> "$filepath"
          ;;
        *)
          # For all other files (json, md, etc.), just copy the content.
          cat "$temp_content_file" > "$filepath"
          ;;
      esac

      echo "  -> Success: '$filepath' has been created/updated."
      distributed_files+=("$filepath")
    else
      echo "  -> Error: Could not find temporary content for $filepath."
    fi
    
    echo "----------------------------------------"
  done

  echo "File distribution complete."
  echo

  # --- Summary Section ---
  if [ ${#distributed_files[@]} -gt 0 ]; then
    echo "Summary of distributed files:"
    for file in "${distributed_files[@]}"; do
      echo "  - $file"
    done
  else
    echo "No new files were distributed."
  fi

  # --- Display Commands Section ---
  # Call the function to find and display any shell commands.
  displayCommands
}

# --- Execute the main function ---
# This starts the entire process.
distributeFiles
