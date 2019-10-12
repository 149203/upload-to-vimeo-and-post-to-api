// Imports API keys from .env file
require("dotenv").config();
const convert_datetime_num_to_str = require("./convert_datetime_num_to_str");

// IMPORTANT - CHANGE THIS DATE!

const event_started_on = 201909141200;
// BE SURE IT MATCHES THE FOLDER SUFFIX

// END IMPORTANT

const axios = require("axios");
const presenter_list_API_URL = `${process.env.PRESENTER_LIST_API}?started_on=${event_started_on}`;
const post_api = process.env.POST_API;
const fs = require("fs");
const Vimeo = require("vimeo").Vimeo;
const date_fns = require("date-fns");

const vimeo_account = new Vimeo(
  process.env.VIMEO_CLIENT_ID,
  process.env.VIMEO_CLIENT_SECRET,
  process.env.VIMEO_ACCESS_TOKEN
);

const event_date_str = date_fns.format(
  convert_datetime_num_to_str(event_started_on),
  "MMMM Do, YYYY"
);

// PUT VIDEOS IN FOLDER THEN UPDATE THIS PATH!
// then run in the command line: node index.js

const files_path = `../../Users/User/Videos/Demo Day ${event_started_on}/`;

console.log({ post_api, event_date_str, files_path });

// Stores all videos in files_path directory to a variable.
const all_videos = fs.readdirSync(files_path);
// Sorts videos by the time/date - puts them in order so it matches presenter_list.js
all_videos.sort(function(a, b) {
  return (
    fs.statSync(files_path + a).mtime.getTime() -
    fs.statSync(files_path + b).mtime.getTime()
  );
});

// We will push each video_obj after upload to this array
const vimeo_response = [];

// Main upload function
function upload_videos(videos_dir, all_videos, video_info) {
  all_videos.forEach((video, index) => {
    let file_name = `${videos_dir}${video}`;
    vimeo_account.upload(
      file_name,
      {
        name: `${video_info[index].title}`,
        description: `A presentation by ${video_info[index].member_id.first_name} ${video_info[index].member_id.last_name} at ${video_info[index].event_id.title}, ${event_date_str}. See Las Vegas Developers for more: http://developers.vegas`
      },
      function(uri) {
        // callback when completed
        console.log("Your video URI is: " + uri);
        // Uncomment this request when using developers.vegas vimeo account.
        // Adds videos to a channel.
        vimeo_account.request(
          {
            // Adds video to channel
            method: "PUT",
            path: `/channels/1449073${uri}`
          },
          function(error, body, status_code, headers) {
            if (error) {
              console.log(error);
            }

            console.log(body);
          }
        );
        vimeo_account.request(
          {
            // Gets all video info
            method: "GET",
            path: uri
          },
          function(error, body, status_code, headers) {
            if (error) {
              console.log(error);
            }

            // we create an object per video and add properties with the response from vimeo.
            const video_obj = video_info[index];

            video_obj.video_screenshot_url = body.pictures.sizes[2].link;
            video_obj.video_screenshot_with_play_url =
              body.pictures.sizes[2].link_with_play_button;
            video_obj.video_url = body.link;
            video_obj.video_iframe = body.embed.html;

            vimeo_response.push(video_obj);

            // Creates a .json file when uploads are done.
            if (vimeo_response.length === video_info.length) {
              console.log(
                `${event_date_str} presentations.json should be ready soon`
              );

              const vimeo_res_JSON = JSON.stringify(vimeo_response);

              // START POST TO PRESENTATIONS API

              axios
                .post(post_api, { demo_day_presentations: vimeo_res_JSON }) // post_api is imported at top
                .then(res => {
                  console.log("BACK FROM API: ", res.data);
                })
                .catch(err => console.log(err.response.data));

              // END POST TO PRESENTATIONS API

              // Creates a .json file where respond from vimeo after upload will be outputted to.
              fs.appendFileSync(
                `${event_date_str} presentations.json`,
                vimeo_res_JSON
              );
            }
          }
        );
      },
      function(bytes_uploaded, bytes_total) {
        var percentage = ((bytes_uploaded / bytes_total) * 100).toFixed(2);
        console.log(bytes_uploaded, bytes_total, percentage + "%");
      },
      function(error) {
        console.log("Failed because: " + error);
      }
    );
  });
}

// upload_videos(files_path, all_videos, presenter_list);

async function get_presenter_list() {
  console.log("API call started");
  try {
    const response = await axios.get(presenter_list_API_URL);
    const presenter_list = response.data;
    console.log(presenter_list);
    console.log("API call finished");
    // upload_videos(files_path, all_videos, presenter_list); // COMMENT / UNCOMMENT TO DO STUFF
  } catch (error) {
    console.error(error);
  }
}
get_presenter_list();
